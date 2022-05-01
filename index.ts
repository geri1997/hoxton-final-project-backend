// #region 'Importing and configuration of Prisma'
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { genres, movies } from './prisma/movies';
import https from 'https'; // or 'https' for https:// URLs
import fs from 'fs';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static('public'));

app.get('/', async (req, res) => {
    res.send('Server Up and Running');
});

app.listen(process.env.PORT, () => {
    console.log(`Server up: http://localhost:4000`);
});
// #endregion


// #region "Token, and getting user loggied in, register, validating if user is logged in"
function createToken(id: number) {

    //@ts-ignore
    const token = jwt.sign({ id: id }, process.env.MY_SECRET, {
        expiresIn: '3days',
    });

    return token;

}

async function getUserFromToken(token: string) {

    //@ts-ignore
    const data = jwt.verify(token, process.env.MY_SECRET);

    const user = await prisma.user.findUnique({
        // @ts-ignore
        where: { id: data.id },
    });

    return user;

}

app.post('/sign-up', async (req, res) => {

    const { email, password, userName } = req.body;

    try {

        const hash = bcrypt.hashSync(password);
        
        const user = await prisma.user.create({
            data: { email: email, password: hash, userName: userName },
        });

        //@ts-ignore
        user.favMovies = [];
        res.send({ user, token: createToken(user.id) });

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

app.post('/login', async (req, res) => {

    const { email, password } = req.body;

    // try {
    const user = await prisma.user.findUnique({
        where: { email: email },
    });

    // @ts-ignore
    const passwordMatches = bcrypt.compareSync(password, user.password);
    
    if (user && passwordMatches) {

        const favorites = await prisma.favorite.findMany({
            where: { userId: user?.id },
        });

        //@ts-ignore
        user.favMovies = await prisma.movie.findMany({
            where: { id: { in: favorites.map((f:any) => f.movieId) } },
            include: { genres: { include: { genre: true } } },
        });

        res.send({ user, token: createToken(user.id) });

    } 
    
    else {
        throw Error('Boom');
    }

    // } catch (err) {
    //     res.status(400).send({ error: 'Email/password invalid.' });
    // }

});

app.get('/validate', async (req, res) => {

    const token = req.headers.authorization || '';

    try {

        const user = await getUserFromToken(token);

        //favourite movies
        const favorites = await prisma.favorite.findMany({
            where: { userId: user?.id },
        });

        //@ts-ignore
        user.favMovies = await prisma.movie.findMany({
            where: { id: { in: favorites.map((f:any) => f.movieId) } },
            include: { genres: { include: { genre: true } } },
        });

        res.send(user);

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});
// #endregion


// #region "REST API Endpoints"
app.get('/movies', async (req, res) => {

    try {

        const movies = await prisma.movie.findMany({
            include: { genres: true },
        });

        res.send(movies);

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

app.get('/movies/page/:pagenr', async (req, res) => {

    const sortBy = req.query.sortBy;
    const ascOrDesc = req.query.ascOrDesc;

    const page = Number(req.params.pagenr);
    const nrToSkip = (page - 1) * 20;

    try {

        const movies = await prisma.movie.findMany({
            
            include: { genres: { include: { genre: true } } },

            orderBy: {
                //@ts-ignore
                [sortBy]: ascOrDesc,
            },

            skip: nrToSkip,
            take: 20

        });

        res.send(movies);

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

//get movie count
app.get('/movie-count', async (req, res) => {

    try {
        const count = await prisma.movie.count();
        res.send({ count });
    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

app.get('/movie/:title', async (req, res) => {

    const title = req.params.title
        .split('')
        .map((char) => (char === '-' ? ' ' : char))
        .join('');

    try {

        const movie = await prisma.movie.findFirst({
            where: { title },
            include: { genres: { include: { genre: true } } }
        });

        res.send(movie);

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

app.get('/comments', async (req, res) => {

    try {
        const comments = await prisma.comment.findMany();
        res.send(comments);
    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

app.get('/favorites', async (req, res) => {

    const token = req.headers.authorization || '';
    
    try {

        const user = await getUserFromToken(token);

        const favorites = await prisma.favorite.findMany({
            where: { userId: user?.id },
        });

        res.send(favorites);

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

app.post('/favorites', async (req, res) => {

    const token = req.headers.authorization || '';
    const { movieId } = req.body;

    try {

        const user = await getUserFromToken(token);

        const favorite = await prisma.favorite.create({
            //@ts-ignore
            data: { userId: user.id, movieId: movieId },
        });

        const favorites = await prisma.favorite.findMany({
            where: { userId: user?.id },
        });

        const generes = await prisma.genre.findMany();
        //@ts-ignore
        user.favMovies = await prisma.movie.findMany({
            where: { id: { in: favorites.map((f) => f.movieId) } },
            include: { genres: { include: { genre: true } } },
        });
        
        // //@ts-ignore
        // user.favorites = favorites;
        // //@ts-ignore
        // user.generes = generes;

        res.send(user);

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

app.get('/genres', async (req, res) => {

    try {
        const generes = await prisma.genre.findMany();
        res.send(generes);
    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

//search endpoint
app.post('/search', async (req, res) => {

    const { title, page } = req.body;
    //page

    try {

        const movies = await prisma.movie.findMany({
            where: {
                title: { contains: title },
            },
            include: { genres: { include: { genre: true } } },
            skip: (page - 1) * 20,
            take: 20,
        });

        //count
        const count = await prisma.movie.count({
            where: {
                title: { contains: title },
            },
        });

        res.send({ movies, count });

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }
    
});

//genre endpoint
app.get('/genres/:genre', async (req, res) => {

    const genre = req.params.genre;
    let page = Number(req.query.page);

    const genreId = await prisma.genre.findFirst({
        where: { name: genre },
    });

    const count = await prisma.movieGenre.count({
        where: {
            genreId: genreId?.id,
        },
    });

    try {

        const movies = await prisma.movie.findMany({

            where: {
                genres: {
                    some: {
                        genre: {
                            name: genre,
                        },
                    },
                },
            },

            include: { genres: { include: { genre: true } } },
            take: 20,
            skip: (page - 1) * 20,

        });

        res.send({ movies, count });

    } 
    
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message });
    }

});

//get latest movies
app.get('/latest', async (req, res) => {

    const latestMovies = await prisma.movie.findMany({

        orderBy: {
            id: 'desc',
        },

        take: 20,

        include: { genres: { include: { genre: true } } }

    });

    res.send(latestMovies);

});


// #region "Adding latest movies"

//sort movies
// app.get('/sort', async (req, res) => {

//     const by = req.query.by;
//     const ascOrDesc = req.query.ascOrDesc;
//     const page = Number(req.query.page);
//     console.log(by, ascOrDesc, page);

//     const movies = await prisma.movie.findMany({

//         orderBy: {
//             //@ts-ignore
//             [by]: ascOrDesc,
//         },

//         take: 20,

//         skip: (page - 1) * 20,

//         include: { genres: { include: { genre: true } } },
//     });

//     res.send(movies);

// });

//add latest movies in db

async function addLatestMovies() {

    const resq = await fetch('https://www.filma24.sh/feed/', {

        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
        }

    });

    const text = await resq.text();

    // const html = cheerio.load(text)
    // const html = jquery.parseHTML(text)
    // console.log(text);

    const parser = new XMLParser();
    let jObj = parser.parse(text);

    const moviesToFetch: any = [];

    for (const item of jObj.rss.channel.item) {

        const foundMovie = await prisma.movie.findFirst({

            where: {
                title: item.title,
            }

        });

        if (foundMovie === null) {
            moviesToFetch.push(item);
        }

    }

    const movies = [];

    for (const movie of moviesToFetch) {

        const singleMovie = await fetch(movie.link);
        const singleMovieText = await singleMovie.text();
        const singleMovieHtml = parse(singleMovieText);
        
        const movieLink = singleMovieHtml.querySelector(
            'div.player div.movie-player p iframe'
        )?.attributes.src;
        
        const movieTitle = singleMovieHtml.querySelector(
            '.movie-info .main-info .title h2'
        )?.innerText;
        
        const trailerLink = singleMovieHtml.querySelector(
            '.trailer-player iframe'
        )?.attributes.src;
        
        const genreLis = singleMovieHtml.querySelectorAll(
            '.secondary-info .info-left .genre li'
        );
        
        const genres: any = [];
        
        genreLis.forEach((li) => genres.push(li.innerText));
        
        const movieLength = singleMovieHtml.querySelector(
            '.info-right span.movie-len'
        )?.innerText;
        
        const releaseYear = singleMovieHtml.querySelector(
            '.info-right span.quality'
        )?.innerText;
        
        const imdbRating = singleMovieHtml.querySelector(
            '.info-right span:last-child a'
        )?.innerText;
        
        const synopsis = singleMovieHtml.querySelector(
            '.synopsis .syn-wrapper p'
        )?.innerText;

        const thumbnai = singleMovieHtml.querySelector(
            `meta[property="og:image"]`
        )?.attributes.content;
        
        // console.log(thumbnail);
        console.log(thumbnai);
        
        const thumbnail = thumbnai?.includes('https')
            ? thumbnai
            : thumbnai?.replace('http', 'https').replace('.so','.sh')
        
            const file = fs.createWriteStream(

                //@ts-ignore
                `public/images/${thumbnail?.split('/').pop()}`

            );
        
        const request = https.get(

            //@ts-ignore
            thumbnail,
            
            function (response) {
                response.pipe(file);
            }

        );

        movies.push({

            title: movieTitle,
            videoSrc: movieLink,
            genres,
            trailerSrc: trailerLink,
            duration: movieLength,
            releaseYear,
            ratingImdb: imdbRating,
            description: synopsis,
            photoSrc: `https://petite-locrian-piper.glitch.me//images/${thumbnail
                ?.split('/')
                .pop()}`
        });

    }

    if (movies.length !== 0) {

        //@ts-ignore
        // movies.forEach(movie=>delete movie.genres)
        movies.forEach(
            //@ts-ignore
            (movie) => (movie.ratingImdb = Number(movie.ratingImdb))
        );

        //@ts-ignore
        movies.forEach(
            //@ts-ignore
            (movie) => (movie.releaseYear = Number(movie.releaseYear))
        );

        movies.forEach(async function (movie) {
            
            const genresa = [];

            for (let genre of movie.genres) {

                const genreId = genres.find((genre1) => genre1.name === genre);

                if (genreId) {

                    const id = genres.findIndex(
                        (genre) => genre.name === genreId?.name
                    );

                    //@ts-ignore
                    genresa.push(id + 1);

                } 
                
                else {

                    const newGenre = await prisma.genre.create({

                        data: {
                            name: genre,
                        }

                    });

                    //@ts-ignore
                    genresa.push(newGenre.id);

                }

            }

            //@ts-ignore
            movie.genres = genresa;

        });

        for (const movie of movies) {

            const createdMovie = await prisma.movie.create({

                //@ts-ignore
                data: {

                    description: movie.description,
                    duration: movie.duration,
                    photoSrc: movie.photoSrc,
                    //@ts-ignore
                    ratingImdb: movie.ratingImdb,
                    //@ts-ignore
                    releaseYear: movie.releaseYear,
                    title: movie.title,
                    videoSrc: movie.videoSrc,
                    trailerSrc: movie.trailerSrc

                }

            });

            for (const genre of movie.genres) {

                await prisma.movieGenre.create({
                    data: { genreId: genre, movieId: createdMovie.id },
                });

            }

        }

    }

}

addLatestMovies();

// #endregion


setInterval(addLatestMovies, 1000 * 60 * 60);
// #endregion


// #region "Getting movies from website xml etc"
app.get('/filma24-new', async (req, res) => {

    const resq = await fetch('https://www.filma24.so/feed', {

        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
        }

    });

    const text = await resq.text();
    // const html = cheerio.load(text)
    // const html = jquery.parseHTML(text)
    // console.log(text);

    const parser = new XMLParser();
    let jObj = parser.parse(text);
    console.log(jObj.rss.channel.item);

    //@ts-ignore
    // res.send(html);
    res.send('ok');
    
});

app.get('/single-movie', async (req, res) => {

    const resq = await fetch('https://www.filma24.so/post-sitemap9.xml');
   
    const htmlText = await resq.text();
    const parser = new XMLParser();
    
    let jObj = parser.parse(htmlText);
    const entries = jObj.urlset.url; //array of each entry that contains loc,image
    
    const movies = [];
    
    for (const entry of entries) {

        console.log(entry);

        const singleMovie = await fetch(entry.loc);
        const singleMovieText = await singleMovie.text();
        const singleMovieHtml = parse(singleMovieText);
        
        const movieLink = singleMovieHtml.querySelector(
            'div.player div.movie-player p iframe'
        )?.attributes.src;
        
        const movieTitle = singleMovieHtml.querySelector(
            '.movie-info .main-info .title h2'
        )?.innerText;
        
        const trailerLink = singleMovieHtml.querySelector(
            '.trailer-player iframe'
        )?.attributes.src;
        
        const genreLis = singleMovieHtml.querySelectorAll(
            '.secondary-info .info-left .genre li'
        );
        
        const genres: any = [];
        
        genreLis.forEach((li) => genres.push(li.innerText));
        
        const movieLength = singleMovieHtml.querySelector(
            '.info-right span.movie-len'
        )?.innerText;
        
        const releaseYear = singleMovieHtml.querySelector(
            '.info-right span.quality'
        )?.innerText;
        
        const imdbRating = singleMovieHtml.querySelector(
            '.info-right span:last-child a'
        )?.innerText;
        
        const synopsis = singleMovieHtml.querySelector(
            '.synopsis .syn-wrapper p'
        )?.innerText;
        
        const file = fs.createWriteStream(
            `images/${entry['image:image']['image:loc'].split('/').pop()}`
        );
        
        const request = https.get(

            entry['image:image']['image:loc'].replace('http', 'https'),
            
            function (response) {
                response.pipe(file);
            }

        );
        
        const thumbnail = entry['image:image']['image:loc'];
        
        movies.push({

            title: movieTitle,
            videoSrc: movieLink,
            genres,
            trailerSrc: trailerLink,
            duration: movieLength,
            releaseYear,
            ratingImdb: imdbRating,
            description: synopsis,
            photoSrc: thumbnail

        });

    }

    // console.log({movieLink,movieTitle,trailerLink,genres,movieLength,releaseYear,imdbRating,synopsis})
    res.send(movies);

});
// #endregion