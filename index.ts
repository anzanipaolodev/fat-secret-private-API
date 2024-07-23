import dotenv from 'dotenv';
import { select } from '@inquirer/prompts';
import puppeteer, { Configuration, ElementHandle, Puppeteer } from 'puppeteer';
import { clickButtonAndWait, selectElementAndType } from './utility';

dotenv.config();
const userName = process.env.FAT_SECRET_USERNAME;
const password = process.env.FAT_SECRET_PASSWORD;
const defaultUrl = process.env.DEFAULT_URL;
(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    if (!defaultUrl) {
        console.error('Missing DEFAULT_URL.');
        return;
    }
    await page.goto(defaultUrl);

    if (!userName) {
        console.error('Missing FAT_SECRET_USERNAME.');
        return;
    }
    await selectElementAndType('#ctl12_Logincontrol1_Name', userName, page);

    if (!password) {
        console.error('Missing FAT_SECRET_PASSWORD.');
        return;
    }
    await selectElementAndType('#ctl12_Logincontrol1_Password', password, page);
    await clickButtonAndWait('#ctl12_Logincontrol1_LoginButton', { 'waitUntil': 'networkidle0' }, page);

    const searchQuery: string = 'pomodoro';
    await clickButtonAndWait('#ctl03 > div.mainContent > div.logoPanel > div > div > div > div.logoContentA > table > tbody > tr > td.menuShortLogoCell > table > tbody > tr > td:nth-child(4) > img',
        { waitUntil: 'networkidle0' },
        page
    )
    await selectElementAndType('#ctl12_ByFood', searchQuery, page);
    await clickButtonAndWait('#searchForm > div:nth-child(2) > a', { waitUntil: 'networkidle0' }, page);

    const resultListHandle = await page.waitForSelector('#content > table > tbody > tr > td.leftCell > div > table > tbody');
    if (!resultListHandle) {
        console.error('Failed to get query results.'); // TODO: Shitty error description, fix it.
        return;
    }
    const urls = await resultListHandle.$$eval('#content > table > tbody > tr > td.leftCell > div > table > tbody > tr > td > a', (elements) => {
        return elements.map(e => e.getAttribute('href'));
    });
    const names = await resultListHandle.$$eval('#content > table > tbody > tr > td.leftCell > div > table > tbody > tr > td > a', (elements) => {
        return elements.map(e => e.textContent);
    });
    const options = urls.map((url, index) => {
        if (names[index])
            return { name: names[index], value: url }
    })
    const selectedResult = await select({
        message: 'Select one result:',
        choices: options,
        loop: false,
    });

    if (!selectedResult) {
        console.error(); // TODO: Add some error message.
        return
    }
    await page.goto('https://www.fatsecret.it/calorie-nutrizione'+selectedResult, {waitUntil: 'networkidle0'});
    const nutritionalValues = await page.evaluate(() => {
        const calories = document.querySelector('#content > table > tbody > tr > td.leftCell > div > table > tbody > tr > td.details > div > table:nth-child(2) > tbody > tr > td:nth-child(1) > div.factValue')?.textContent;
        const fats = document.querySelector('#content > table > tbody > tr > td.leftCell > div > table > tbody > tr > td.details > div > table:nth-child(2) > tbody > tr > td:nth-child(3) > div.factValue')?.textContent;
        const carbs = document.querySelector('#content > table > tbody > tr > td.leftCell > div > table > tbody > tr > td.details > div > table:nth-child(2) > tbody > tr > td:nth-child(5) > div.factValue')?.textContent;
        const proteins = document.querySelector('#content > table > tbody > tr > td.leftCell > div > table > tbody > tr > td.details > div > table:nth-child(2) > tbody > tr > td:nth-child(7) > div.factValue')?.textContent;

        return {calories, fats, carbs, proteins}
    })
    console.log(nutritionalValues);
    await browser.close();
})();