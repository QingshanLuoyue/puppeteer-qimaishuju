const puppeteer = require('puppeteer')
const fs = require('fs')

var searchCount = 0
var useArr

// var origindataPath = './origindata/search.json'
var origindataPath = './origindata/t2.json'

var searchTypeStoragePath = './storage/1-searchType.txt'

var downloadPageStoragePath = './storage/3-downloadPageHistory.txt'
var downloadNumStoragePath = './storage/4-downloadNumHistory.txt'
var finalDataStoragePath = './storage/5-finalDataHistory.txt'

var downloadPageFilePath = './tempdata/3-downloadPage.txt'
var downloadNumFilePath = './tempdata/4-downloadNum.txt'
var finalDataFilePath = './tempdata/5-finalData.txt'


/*********************************************************************************/
// 生成数据
function productUseArr(readPath) {
    let result = []
    if (readPath === origindataPath) {
        console.log(1)
        result = JSON.parse(fs.readFileSync(readPath, { encoding: 'utf-8'}))
        for (var i = 0; i < result.length; i++) {
            result[i].shelvesLink = result[i].link.replace(/baseinfo/, 'shelves')
            result[i].downTotalLink = result[i].link.replace(/baseinfo/, 'downTotal')
            result[i].readPath = readPath
        }
        console.log(11)
        
    } else {
        console.log(2, readPath)
        result = fs.readFileSync(readPath, { encoding: "utf-8" }).toString().replace(/\n$/, '').split('\n')
        for (let index = 0; index < result.length; index++) {
            result[index] = JSON.parse(result[index])  
            result[index].readPath = readPath
        }
        result = uniqueArr(result)
        // console.log('uniqueArr = ', result)
        console.log(22)
        
    }
    console.log('新一轮数据，数据长度 = ', result.length);    
    console.log('********************************************************************\n');    
    return result
}
// useArr = JSON.parse('[' + fs.readFileSync(originDataPath, { encoding: 'utf-8'}).toString().replace(/\n$/, '').split('\n') + ']');
// 数组去重
function uniqueArr(data) {
    var res = [data[0]];
    for (var i = 1; i < data.length; i++) {
         var flag = false;
        for (var j = 0; j < res.length; j++) {
            if (data[i].no == res[j].no) {
                flag = true;
                break;
            }
        }
        if (!flag) {
            res.push(data[i])
        }
    }
    return res;
}
/*********************************************************************************/

var searchTypeList = ['page', 'num', 'final']
var searchTypeCount = 0

var storagePathMap = {
    page: downloadPageStoragePath,
    num: downloadNumStoragePath,
    final: finalDataStoragePath,
}
var originDataPathMap = {
    page: origindataPath,// 当搜索类别是page时，读取数据源为downloadPageFilePath
    num: downloadPageFilePath,
    final: downloadNumFilePath,
}
var filePathMap = {
    page: downloadPageFilePath,// 当搜索类别是page时，写入数据源为downloadPageFilePath
    num: downloadNumFilePath,
    final: finalDataFilePath,
}
var propMap = {
    page: 'shelvesLink',
    num: 'downTotalLink',
    final: 'dlink',
}


var searchTypeCount = readStorage(searchTypeStoragePath) // 读取程序搜索类型
searchTypeCount = searchTypeCount ? parseInt(searchTypeCount) : 0;
if (searchTypeCount >= 3) {
    console.log('没有其他可以搜索了')
    console.log('********************************************************************\n');
    var processChild = require("child_process")
    var execFile = processChild.execFile

    execFile("node", ["6_toJson.js"], null, function (err, stdout, stderr) {
        console.log("execFileSTDOUT:")
        // console.log("execFileSTDOUT:", JSON.stringify(stdout))
        console.log("execFileSTDERR:")
        // console.log("execFileSTDERR:", JSON.stringify(stderr))
    })
    console.log('生成数据完毕')
    console.log('********************************************************************\n');

    console.log('退出程序')
    console.log('********************************************************************\n');
    process.exit(0)
}
searchType = searchTypeList[searchTypeCount]

var currentStoragePath = storagePathMap[searchType]
var currentWriteFilePath = filePathMap[searchType]
var currentReadFilePath = originDataPathMap[searchType]
var currentProp = propMap[searchType]


useArr = productUseArr(currentReadFilePath)


var searchCount = readStorage(currentStoragePath) // 读取程序中途断点位置
searchCount = searchCount ? parseInt(searchCount) : 0;
if (searchCount >= useArr.length) {
    console.log('所有信息已经全部写入' + currentWriteFilePath + '文件！')
}
// 写入缓存
function writeStorage(num, storagePath) {
    fs.writeFileSync(storagePath, num, { flag: 'w'});
}
// 读取缓存
function readStorage(storagePath) {
    var t = fs.readFileSync(storagePath, { encoding: 'utf-8'});
    return t ? t : ''
}

console.log('currentStoragePath = ', currentStoragePath)
console.log('currentWriteFilePath = ', currentWriteFilePath)
console.log('currentReadFilePath = ', currentReadFilePath)
console.log('currentProp = ', currentProp)
console.log('searchCount = ', searchCount)
console.log('searchType = ', searchType)
console.log('searchTypeCount = ', searchTypeCount)
console.log('********************************************************************\n');

/*********************************************************************************/


let browser, page
let url

// 一开始就获取失败的重试变量
var failTryCount = 1
var failTryMaxNum = 3

// 获取到信息，但是没有搜索结果或者js还未执行得不到结果，从而进行重试的变量
var reTryCount = 1
var reTryMaxNum = 3
async function initStart() {

    browser = await puppeteer.launch({
        headless: true,
        // slowMo: 250,
    })
    page = await browser.newPage()
    page.on('console', msg => console.log('pageLog:', msg.text()))

    circleSearch(page)
    
}
initStart()

async function circleSearch(page) {
    url = useArr[searchCount][currentProp]
    console.log('\ncircleSearch: ')
    console.log('searchCount:', searchCount)
    console.log('url:', url)
    await page.goto(url, {
        waitUntil: 'networkidle2'
    })
    await page.mainFrame().addScriptTag({
        url: 'https://cdn.bootcss.com/jquery/1.11.3/jquery.min.js'
    })
    await page.waitFor(2000)
    
    
    let market = useArr[searchCount].market
    const content = await page.evaluate((currentProp, market) => {
        console.log('currentProp = ', currentProp)
        if (currentProp === 'shelvesLink') {
            // 市场/bundleid
            console.log('shelvesLink1')
            var BundleID = $('.app-header .appid .value').html()
            var searchRes = $('#shelves .ivu-table-row');
            var versionObj = []
            searchRes.each(function(index, item){
                versionObj.push({
                    market: $(item).find('.ivu-table-column-center').eq(0).find('.ivu-table-cell span').html(),
                    appName: $(item).find('.ivu-table-column-center').eq(2).find('.ivu-table-cell div').html(),
                    v: $(item).find('.ivu-table-column-center').eq(3).find('.ivu-table-cell div').html(),
                    dlink: $(item).find('.ivu-table-column-center').eq(4).find('.ivu-table-cell a').attr('href'),
                    bundleID: BundleID
                })
            })
            var finalRes = [];
            for (var m = 0; m < versionObj.length; m++) {
                if (versionObj[m].market === '应用宝' && versionObj[m].dlink) {
                    finalRes = versionObj[m];
                    break;
                } else if (versionObj[m].market === '百度' && versionObj[m].dlink) {
                    finalRes = versionObj[m]
                    break;
                } else if (versionObj[m].market === '360' && versionObj[m].dlink) {
                    finalRes = versionObj[m]
                    break;
                }
            }
            if (finalRes.length === 0) {
                return '无数据'
            } else if (!finalRes.dlink) {
                return '无数据'
            }
            return {data: finalRes, code: 'page'};
                
            console.log('shelvesLink2')
        } else if (currentProp === 'downTotalLink') {
            // 下载量
            console.log('downTotalLink1')
            var totalDownloadNum = $('#down-total-stat .col-box.active').html()
            if (totalDownloadNum === '' || totalDownloadNum === undefined) {
                return '无数据'
            }
            return { data: {totalDownloadNum: totalDownloadNum}, code: 'num'}
            console.log('downTotalLinkk2')
        } else if (currentProp === 'dlink') {
            console.log('dlink1')
            
            // apk下载地址
            if (market === '应用宝') {
                // 获取搜索出来的公司详细信息
                var searchRes = $('.det-ins-btn-box .det-down-btn').attr('data-apkurl');
                if (searchRes === '' || searchRes === undefined) {
                    return '无数据'
                }
                return { data: {apkUrl: searchRes},  code: 'final'};
            } else if (market === '百度') {
                // 获取搜索出来的公司详细信息
                var searchRes = $('#doc .yui3-g .app-intro .area-download a').attr('href');
                if (searchRes === '' || searchRes === undefined) {
                    return '无数据'
                }
                return { data: {apkUrl: searchRes},  code: 'final'};
            } else if (market === '360') {
                // 获取搜索出来的公司详细信息
                var searchRes = window.appInfo
                // var searchRes = href ? href.match(/(^|&)url=([^&]*)(&|$)/)[2] : '无'
                if (searchRes === '' || searchRes === undefined || searchRes.url === '' || searchRes.url === undefined) {
                    return '无数据'
                }
                return { data: {apkUrl: searchRes.url},  code: 'final'};
            }
            console.log('dlink2')
            
        }
    }, currentProp, market)
    console.log('content:', content)
    if (content && content !== '无数据') {
        reTryCount = 1;
        if (content.data) {
            for (var key in content.data) {
                useArr[searchCount][key] = content.data[key]
            }
        }
        writeToTxt(currentWriteFilePath, useArr[searchCount])
        writeStorage(searchCount, currentStoragePath)

        next(currentWriteFilePath)
        // searchCount++

        circleSearch(page)
    } else {
        if (reTryCount <= reTryMaxNum) {
            console.log('\n没有搜索到结果，可能是获取速度过快，js还未执行，第'+ reTryCount +'次重试···');
            console.log('url = ', url)
            reTryCount++;
            circleSearch(page)
        } else {
            console.log('\n没有搜索到结果，可能是获取速度过快，js还未执行，第'+ reTryCount +'次重试失败，放弃，查询下一个···');
            reTryCount = 1
            // 失败超过限制次数，放弃，执行获取下一个链接
            writeToTxt(currentWriteFilePath, useArr[searchCount])
            writeStorage(searchCount, currentStoragePath)

            next(currentWriteFilePath)
            // searchCount++

            circleSearch(page)
        }
    }
}

// 写入数据
function writeToTxt(filePath, html) {
    // console.log('写入 = ', JSON.stringify(html))
    console.log('写入数据， 应用名称：' + html.appName)
    console.log('********************************************************************\n');
    var str = '';

    str += JSON.stringify(html) + '\n';

    /***********************/
    fs.writeFileSync(filePath, str, { flag: 'a'});

}

function next(filePath) {
    searchCount++
    if (searchCount > (useArr.length - 1)) {
        console.log('所有详细信息已经全部写入' + filePath + '文件！')
        console.log('********************************************************************\n');
    
        
        // 读取当前已经录入的数据作为原始数据
        useArr = productUseArr(filePath)
        // 重置当前搜索序号
        searchCount = 0
        
        // 当前搜索类型序号加1
        searchTypeCount++
        writeStorage(searchTypeCount, searchTypeStoragePath)
        console.log('searchTypeCount = ', searchTypeCount)
        if (searchTypeCount === 3) {
            console.log('已经搜索完毕')
            console.log('********************************************************************\n');
            var processChild = require("child_process")
            var execFile = processChild.execFile
    
            execFile("node", ["6_toJson.js"], null, function (err, stdout, stderr) {
                console.log("execFileSTDOUT:")
                // console.log("execFileSTDOUT:", JSON.stringify(stdout))
                console.log("execFileSTDERR:")
                // console.log("execFileSTDERR:", JSON.stringify(stderr))
            })
            console.log('生成数据完毕')
            console.log('********************************************************************\n');
    
            console.log('退出程序')
            console.log('********************************************************************\n');
            process.exit(0)
        } else {
            // 获取当前搜索类型值
            var searchType = searchTypeList[searchTypeCount]
    
            currentStoragePath = storagePathMap[searchType]
            currentWriteFilePath = filePathMap[searchType]
            currentReadFilePath = originDataPathMap[searchType]
            currentProp = propMap[searchType]
    
            console.log('新一轮搜索')
            console.log('currentStoragePath = ', currentStoragePath)
            console.log('currentWriteFilePath = ', currentWriteFilePath)
            console.log('currentReadFilePath = ', currentReadFilePath)
            console.log('currentProp = ', currentProp)
            console.log('searchCount = ', searchCount)
            console.log('searchType = ', searchType)
            console.log('searchTypeCount = ', searchTypeCount)
            console.log('********************************************************************\n');
            circleSearch(page)
            return true
        }
    }
}