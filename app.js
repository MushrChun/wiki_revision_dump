const request = require('request');
const debug = require('debug')('wiki_dump');
const fs = require('fs');
const events = require('events');
const eventEmitter = new events.EventEmitter();

const buildUrl = (articleName, state) => {
    const endDate = new Date(2018,2).toISOString();
    debug(endDate);
    let targetUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${articleName}&rvprop=timestamp%7Cuser%7Cflags%7Csize%7Cparsedcomment%7Cids%7Csha1&rvlimit=max&rvstart=${endDate}&format=json`;
    if(state.flag) targetUrl += `&rvcontinue=${state.rvcontinue}`;
    debug(state);
    return targetUrl;
}

const checkIfContinued = (data) => {
    return data.continue!=undefined?true:false;
}

const extractRevisions = (data) => {
    const pages = data.pages;
    let revisions;
    for(key in pages){
        const value = pages[key];
        revisions = value.revisions;
        revisions.forEach((revision) => {
            revision.title = value.title;
        });
    }
    return revisions;
}

const mergeArray = (target, source) => {
    source.forEach(item => {
        target.push(item);
    });
}

const fetchArticleRevision = (articleName, store, state) => {

    const targetUrl = buildUrl(articleName, state);
    debug(targetUrl);
    request.get(targetUrl, (error, response, body)=>{
        debug(body);
        if(!body) return;
        const parsedData = JSON.parse(body);
        debug(parsedData);
        mergeArray(store, (extractRevisions(parsedData.query)));
        if(checkIfContinued(parsedData)) fetchArticleRevision(articleName, store, { flag: true, rvcontinue:parsedData.continue.rvcontinue});
        else eventEmitter.emit(`${articleName} fetch done`);
    })
}

const prepareListener = (articleName, store) => {
    eventEmitter.on(`${articleName} fetch done`, () => {
        debug(`${articleName} fetch done`);
        fs.writeFileSync(`dataset/${articleName}.json`,  JSON.stringify(store, null, 4));
    });
}

const main = () => {
    
    const files = fs.readdirSync('/Volumes/ExtSD/web-data/revisions');
    // const files = fs.readdirSync('/Volumes/ExtSD/web-data/test-data/a2-test1');
    // const files = fs.readdirSync('/Volumes/ExtSD/web-data/test-data/a2-test2');
    // const files = fs.readdirSync('test');
    
    files.forEach((file) => {

        if(/^\..*/.test(file)) {
            return;
        };
        const name = file.slice(0, -5);
        debug(name);
        const store = [];
        fetchArticleRevision(name, store, {flag: false});
        prepareListener(name, store);
    });
}

main();

