import * as puppeteer from 'puppeteer';

/**
 * Select an element and type text in it
 */
export async function selectElementAndType(selector: string, text: string, page: puppeteer.Page): Promise<void> {
    const element: puppeteer.ElementHandle<Element> | null = await page.waitForSelector(selector);
    if (element) {
        await element.type(text);
    }
}

/**
 * Click button an wait until selected option
 */
export async function clickButtonAndWait(selector: string, waitFor: puppeteer.WaitForOptions | null, page: puppeteer.Page): Promise<void> {
    const buttonElement: puppeteer.ElementHandle<Element> | null = await page.waitForSelector(selector);
    if (buttonElement) {
        await buttonElement.click();
    }
    if (waitFor) {
        await page.waitForNavigation(waitFor);
    }
}

/**
 * Intercept requests and collect data
 */
export async function interceptedAndCollectData(targetUrl: string, gotoUrl: string, targetMethod: string, page: puppeteer.Page, editDataCallback: (data: any) => any, collectExtra?: boolean): Promise<any> {
    return new Promise(async (resolve, reject) => {
        let interceptedData: Object | null;
        let requestHeaders: Object | null;
        let requestUrl: Object | null;
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.method() == targetMethod && request.url().includes(targetUrl)) {
                const originalPostData: string | undefined = (targetMethod == "POST") ? request.postData() : undefined;
                if (originalPostData) {
                    const postDataParsed = JSON.parse(originalPostData);
                    const newData = editDataCallback(postDataParsed);
                    request.continue({ postData: JSON.stringify(newData) });
                } // else reject(new Error(`Unable to get POST data for request: ${targetUrl}`));
                if (collectExtra) {
                    requestHeaders = request.headers();
                    requestUrl = request.url();
                }
                request.continue();
            } else request.continue();
        })
        page.on('response', async (response) => {
            if (response.url().includes(targetUrl) && response.headers()['content-length'] !== '0') {
                const responseData: Object = await response.json();
                interceptedData = responseData;
                resolve({ interceptedData, requestHeaders, requestUrl});
            }
        });
        page.goto(gotoUrl);
    })
}

/**
 * Function to make a GET request to a specified URL.
 */
export async function makeGetRequest(url: string, headers: any): Promise<any> {
    try {
        const options: object = headers ? { method: "GET", headers: headers} : { method: "GET" };
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error making GET request: ${error}`);
        return null;
    }
}