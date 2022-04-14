import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { movieGenres, movies} from './movies';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

const users = [
    {
        id: 1,
        userName: 'avenger22',
        email: 'jurgenhasmeta@email.com',
        password: bcrypt.hashSync('jurgen123', 8),
    },
    {
        id: 2,
        userName: 'geri12',
        email: 'geri@email.com',
        password: bcrypt.hashSync('geri123', 8),
    },
    {
        id: 3,
        userName: 'visard12',
        email: 'andrea@email.com',
        password: bcrypt.hashSync('visard123', 8),
    },
    {
        id: 4,
        userName: 'marsel12',
        email: 'marsel@email.com',
        password: bcrypt.hashSync('marsel123', 8),
    },
];

const genres = [
    { name: 'Aksion' },
    { name: 'Aziatik' },
    { name: 'Krim' },
    { name: 'NETFLIX' },
    { name: 'Horror' },
    { name: 'Thriller' },
    { name: 'Fantashkencë' },
    { name: 'Fantazi' },
    { name: 'Dramë' },
    { name: 'Spanjoll' },
    { name: 'Aventurë' },
    { name: 'Komedi' },
    { name: 'Histori' },
    { name: 'Luftë' },
    { name: 'Rus' },
    { name: 'Romancë' },
    { name: 'Biografi' },
    { name: 'Italian' },
    { name: 'Mister' },
    { name: 'Sport' },
    { name: 'Familjar' },
    { name: 'Muzikë' },
    { name: 'Animuar' },
    { name: 'Erotik +18' },
    { name: 'Nordik' },
    { name: 'SË SHPEJTI' },
    { name: 'Dokumentar' },
    { name: 'Turk' },
    { name: 'Gjerman' },
    { name: 'Francez' },
    { name: 'Hindi' },
];

async function createStuff() {
    await prisma.user.deleteMany();

    for (const user of users) {
        await prisma.user.create({ data: user });
    }

    await prisma.genre.deleteMany();

    for (const genre of genres) {
        await prisma.genre.create({ data: genre });
    }

    await prisma.movie.deleteMany();

    for (const movie of movies) {
        await prisma.movie.create({ data: movie });
    }

    await prisma.movieGenre.deleteMany();

    for (const movieGenre in movieGenres) {
        for (const genre of movieGenres[movieGenre]) {
            await prisma.movieGenre.create({
                data: { genreId: genre, movieId: Number(movieGenre) + 1 },
            });
        }
    }
}

createStuff();
