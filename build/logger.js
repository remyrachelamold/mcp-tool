import winston from 'winston';
const logger = winston.createLogger({
    level: 'info', // log everything 'info' and above
    format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
    transports: [
        new winston.transports.Console(), // logs go to your terminal
        new winston.transports.File({ filename: 'logs/app.log' }) // logs saved to file
    ],
});
export default logger;
