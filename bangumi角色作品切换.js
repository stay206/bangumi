// ==UserScript==
// @name         Bangumi人物页面角色/作品显示切换及日期排序
// @version      1.0
// @description  在人物的参与角色界面添加角色/作品切换功能及日期排序
// @author       Sumora&Trae
// @match        https://bangumi.tv/person/*/works/voice*
// @match        https://bgm.tv/person/*/works/voice*
// @match        https://chii.in/person/*/works/voice*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面完全加载
    function waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback();
        } else {
            setTimeout(function() {
                waitForElement(selector, callback);
            }, 100);
        }
    }

    // 初始化函数
    function init() {
        // 找到div.subjectFilter元素
        const subjectFilter = document.querySelector('.subjectFilter');
        if (!subjectFilter) {
            return;
        }

        // 找到里面的ul元素
        const uls = subjectFilter.querySelectorAll('ul');
        if (uls.length < 2) {
            return;
        }

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .item {
                transition: all 0.3s ease;
            }
        `;
        document.head.appendChild(style);
        
        // 创建显示控制ul
        const controlUl = document.createElement('ul');
        controlUl.className = 'grouped clearit';
        
        // 创建标题li
        const titleLi = document.createElement('li');
        titleLi.className = 'title';
        titleLi.innerHTML = '<span>显示</span>';
        controlUl.appendChild(titleLi);
        
        // 创建角色li和a元素
        const roleLi = document.createElement('li');
        const roleLink = document.createElement('a');
        roleLink.href = '#';
        roleLink.textContent = '角色';
        roleLi.appendChild(roleLink);
        controlUl.appendChild(roleLi);
        
        // 创建作品li和a元素
        const workLi = document.createElement('li');
        const workLink = document.createElement('a');
        workLink.href = '#';
        workLink.textContent = '作品';
        workLi.appendChild(workLink);
        controlUl.appendChild(workLi);
        
        // 创建ID序控制ul
        const idOrderUl = document.createElement('ul');
        idOrderUl.className = 'grouped clearit';
        
        // 创建ID序标题li
        const idOrderTitleLi = document.createElement('li');
        idOrderTitleLi.className = 'title';
        idOrderTitleLi.innerHTML = '<span>ID序</span>';
        idOrderUl.appendChild(idOrderTitleLi);
        
        // 创建默认li和a元素
        const defaultLi = document.createElement('li');
        const defaultLink = document.createElement('a');
        defaultLink.href = '#';
        defaultLink.textContent = '默认';
        defaultLi.appendChild(defaultLink);
        idOrderUl.appendChild(defaultLi);
        
        // 创建升序li和a元素
        const ascLi = document.createElement('li');
        const ascLink = document.createElement('a');
        ascLink.href = '#';
        ascLink.textContent = '升序';
        ascLi.appendChild(ascLink);
        idOrderUl.appendChild(ascLi);
        
        // 创建降序li和a元素
        const descLi = document.createElement('li');
        const descLink = document.createElement('a');
        descLink.href = '#';
        descLink.textContent = '降序';
        descLi.appendChild(descLink);
        idOrderUl.appendChild(descLi);
        
        // 创建日期序控制ul
        const dateOrderUl = document.createElement('ul');
        dateOrderUl.className = 'grouped clearit';
        
        // 创建日期序标题li
        const dateOrderTitleLi = document.createElement('li');
        dateOrderTitleLi.className = 'title';
        dateOrderTitleLi.innerHTML = '<span>日期序</span>';
        dateOrderUl.appendChild(dateOrderTitleLi);
        
        // 创建日期默认li和a元素
        const dateDefaultLi = document.createElement('li');
        const dateDefaultLink = document.createElement('a');
        dateDefaultLink.href = '#';
        dateDefaultLink.textContent = '默认';
        dateDefaultLi.appendChild(dateDefaultLink);
        dateOrderUl.appendChild(dateDefaultLi);
        
        // 创建日期升序li和a元素
        const dateAscLi = document.createElement('li');
        const dateAscLink = document.createElement('a');
        dateAscLink.href = '#';
        dateAscLink.textContent = '升序';
        dateAscLi.appendChild(dateAscLink);
        dateOrderUl.appendChild(dateAscLi);
        
        // 创建日期降序li和a元素
        const dateDescLi = document.createElement('li');
        const dateDescLink = document.createElement('a');
        dateDescLink.href = '#';
        dateDescLink.textContent = '降序';
        dateDescLi.appendChild(dateDescLink);
        dateOrderUl.appendChild(dateDescLi);
        
        // 添加到页面中，放在第二个ul后面
        const secondUl = uls[1];
        secondUl.parentNode.insertBefore(controlUl, secondUl.nextSibling);
        secondUl.parentNode.insertBefore(idOrderUl, controlUl.nextSibling);
        secondUl.parentNode.insertBefore(dateOrderUl, idOrderUl.nextSibling);
        
        // 显示日期序控制（在角色和作品视图下都显示）
        dateOrderUl.style.display = 'block';

        // 默认视图为角色
        let currentView = 'role';
        // 默认ID序为默认
        let currentIdOrder = 'default';
        // 默认日期序未激活
        let currentDateOrder = 'none';
        
        // 直接设置初始链接样式
        roleLink.className = 'l focus';
        workLink.className = 'l';
        defaultLink.className = 'l focus';
        ascLink.className = 'l';
        descLink.className = 'l';
        dateDefaultLink.className = 'l focus';
        dateAscLink.className = 'l';
        dateDescLink.className = 'l';
        
        // 保存原始结构，以便在恢复时使用
        const originalItems = [];
        const items = document.querySelectorAll('.item');
        items.forEach(item => {
            originalItems.push(item.innerHTML);
        });
        
        // 保存作品视图的原始结构
        let workViewOriginalItems = [];
        
        // 保存角色视图的原始结构（用于恢复）
        const roleViewOriginalItems = [...originalItems];
        
        // 收集所有作品ID并预加载日期信息
        const workIds = new Set();
        const workLinksMap = new Map(); // 存储作品链接元素
        
        items.forEach(roleItem => {
            const workLinks = roleItem.querySelectorAll('.innerRightList a, .innerLeftItem a');
            workLinks.forEach(link => {
                // 只收集作品链接（/subject/），不收集角色链接（/character/）
                if (link.href.includes('/subject/')) {
                    const id = extractIdFromLink(link.href);
                    if (id) {
                        workIds.add(id);
                        workLinksMap.set(id, link);
                    }
                }
            });
        });
        
        // 日期信息缓存，包含过期时间
        const dateCache = {};
        const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时
        
        // 预加载日期信息
        async function preloadDateInfo() {
            try {
                // 尝试从localStorage加载缓存
                const cachedData = localStorage.getItem('bangumi_date_cache');
                if (cachedData) {
                    const parsedData = JSON.parse(cachedData);
                    const currentTime = Date.now();
                    
                    // 只加载未过期的缓存
                    Object.keys(parsedData).forEach(key => {
                        const item = parsedData[key];
                        if (item && item.expiry && item.expiry > currentTime) {
                            dateCache[key] = item.value;
                        }
                    });
                }
                
                // 分批并行获取所有作品的日期信息
                const workIdArray = Array.from(workIds);
                const batchSize = 20; // 每批次包含的作品数量
                const concurrentPerBatch = 5; // 每批次内的并发数
                
                // 分成多个批次
                const batches = [];
                for (let i = 0; i < workIdArray.length; i += batchSize) {
                    batches.push(workIdArray.slice(i, i + batchSize));
                }
                
                // 并行处理所有批次
                const allBatchPromises = batches.map(async (batch) => {
                    // 批次内的并发处理
                    const batchResults = [];
                    for (let i = 0; i < batch.length; i += concurrentPerBatch) {
                        const concurrentBatch = batch.slice(i, i + concurrentPerBatch);
                        const concurrentPromises = concurrentBatch.map(async (workId) => {
                            // 如果已经有缓存，使用缓存的日期并添加data属性
                            if (dateCache[workId]) {
                                const link = workLinksMap.get(workId);
                                if (link) {
                                    const date = dateCache[workId];
                                    const dateObj = parseDate(date);
                                    if (dateObj) {
                                        const year = dateObj.getFullYear();
                                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                        const day = String(dateObj.getDate()).padStart(2, '0');
                                        const dateString = `${year}-${month}-${day}`;
                                        link.setAttribute('data-date', dateString);
                                    }
                                }
                                return;
                            }
                            
                            const date = await getSubjectDate(workId);
                            if (date) {
                                dateCache[workId] = date;
                                // 为对应的作品链接添加data-date属性
                                const link = workLinksMap.get(workId);
                                if (link) {
                                    const dateObj = parseDate(date);
                                    if (dateObj) {
                                        const year = dateObj.getFullYear();
                                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                        const day = String(dateObj.getDate()).padStart(2, '0');
                                        const dateString = `${year}-${month}-${day}`;
                                        link.setAttribute('data-date', dateString);
                                    }
                                }
                            } else {
                                // 即使没有获取到日期信息，也为链接添加空的data-date属性
                                const link = workLinksMap.get(workId);
                                if (link) {
                                    link.setAttribute('data-date', '');
                                }
                            }
                        });
                        
                        // 等待当前并发批次完成
                        const results = await Promise.all(concurrentPromises);
                        batchResults.push(...results);
                    }
                    
                    return batchResults;
                });
                
                // 等待所有批次完成
                await Promise.all(allBatchPromises);
                
                // 保存缓存到localStorage，添加过期时间
                const cacheWithExpiry = {};
                const expiryTime = Date.now() + CACHE_EXPIRY;
                
                Object.keys(dateCache).forEach(key => {
                    cacheWithExpiry[key] = {
                        value: dateCache[key],
                        expiry: expiryTime
                    };
                });
                
                localStorage.setItem('bangumi_date_cache', JSON.stringify(cacheWithExpiry));
            } catch (error) {
                // 静默处理错误
            }
        }
        
        // 启动预加载
        preloadDateInfo();
        
        // 更新链接样式
        function updateLinkStyles() {
            if (currentView === 'role') {
                roleLink.className = 'l focus';
                workLink.className = 'l';
            } else {
                workLink.className = 'l focus';
                roleLink.className = 'l';
            }
        }
        
        // 更新ID序链接样式
        function updateIdOrderStyles() {
            if (currentIdOrder === 'default') {
                defaultLink.className = 'l focus';
                ascLink.className = 'l';
                descLink.className = 'l';
            } else if (currentIdOrder === 'asc') {
                ascLink.className = 'l focus';
                defaultLink.className = 'l';
                descLink.className = 'l';
            } else {
                descLink.className = 'l focus';
                defaultLink.className = 'l';
                ascLink.className = 'l';
            }
        }
        
        // 更新日期序链接样式
        function updateDateOrderStyles() {
            if (currentDateOrder === 'asc') {
                dateAscLink.className = 'l focus';
                dateDefaultLink.className = 'l';
                dateDescLink.className = 'l';
            } else if (currentDateOrder === 'desc') {
                dateDescLink.className = 'l focus';
                dateDefaultLink.className = 'l';
                dateAscLink.className = 'l';
            } else {
                dateDefaultLink.className = 'l focus';
                dateAscLink.className = 'l';
                dateDescLink.className = 'l';
            }
        }
        
        // 从网页提取作品日期信息
        async function getSubjectDate(subjectId) {
            try {
                // 先检查缓存
                if (dateCache[subjectId]) {
                    return dateCache[subjectId];
                }
                
                // 构建条目的URL，使用当前页面的域名
                const currentDomain = window.location.origin;
                const subjectUrl = `${currentDomain}/subject/${subjectId}`;
                
                // 访问条目页面
                const response = await fetch(subjectUrl);
                
                // 检查响应状态
                if (!response.ok) {
                    return null;
                }
                
                // 获取页面HTML
                const html = await response.text();
                
                // 解析HTML，提取日期信息
                // 首先尝试从infobox中提取日期
                const dateFields = [
                    '放送开始', '发售日', '上映年度', '发售日期', 
                    '发行日期', '开始', '上映日'
                ];
                
                // 遍历查找日期字段
                for (const field of dateFields) {
                    // 匹配ul#infobox中的日期信息
                    const regex = new RegExp(`<li[^>]*><span class="tip">${field}: </span>([^<]+)</li>`, 'i');
                    const match = html.match(regex);
                    if (match && match[1]) {
                        // 提取日期
                        let date = match[1].trim();
                        // 移除括号内容（包括半角和全角括号）
                        date = date.replace(/\([^)]*\)|（[^）]*）/g, '').trim();
                        // 保存到内存缓存
                        dateCache[subjectId] = date;
                        // 保存缓存到localStorage，添加过期时间
                        const cachedData = localStorage.getItem('bangumi_date_cache');
                        let cacheWithExpiry = {};
                        
                        if (cachedData) {
                            try {
                                cacheWithExpiry = JSON.parse(cachedData);
                            } catch (e) {
                    // 静默处理错误
                }
                        }
                        
                        const expiryTime = Date.now() + CACHE_EXPIRY;
                        cacheWithExpiry[subjectId] = {
                            value: date,
                            expiry: expiryTime
                        };
                        
                        localStorage.setItem('bangumi_date_cache', JSON.stringify(cacheWithExpiry));
                        return date;
                    }
                }
                
                // 尝试匹配子容器格式: <li class="sub_container"><ul>...</ul></li>
                for (const field of dateFields) {
                    // 更宽松的正则表达式，允许标签之间的任意空白和换行
                    const subContainerRegex = new RegExp(`<li[^>]*class=["']sub_container["'][^>]*>[\s\S]*?<li[^>]*class=["']sub_section["'][^>]*>[\s\S]*?<span class=["']tip["']>${field}:[\s\S]*?</span>[\s\S]*?</li>[\s\S]*?<li[^>]*class=["']sub["'][^>]*>.*?</ul>[\s\S]*?</li>`, 'i');
                    const subContainerMatch = html.match(subContainerRegex);
                    
                    if (subContainerMatch) {
                        const subContainerHtml = subContainerMatch[0];
                        
                        // 提取所有子项的日期
                        const subRegex = /<li[^>]*class=["']sub["'][^>]*><span class=["']tip["']>[^<]+<\/span>\s*([^<]+)<\/li>/g;
                        const dates = [];
                        let subMatch;
                        
                        while ((subMatch = subRegex.exec(subContainerHtml)) !== null) {
                            const dateStr = subMatch[1].trim();
                            dates.push(dateStr);
                        }
                        
                        if (dates.length > 0) {
                            // 尝试解析每个日期并返回最早的一个
                            const parsedDates = [];
                            dates.forEach(dateStr => {
                                const date = parseDate(dateStr);
                                if (date) {
                                    parsedDates.push({ date, original: dateStr });
                                }
                            });
                            
                            if (parsedDates.length > 0) {
                                // 按日期排序
                                parsedDates.sort((a, b) => a.date - b.date);
                                let earliestDate = parsedDates[0].original;
                                // 移除括号内容（包括半角和全角括号）
                                earliestDate = earliestDate.replace(/\([^)]*\)|（[^）]*）/g, '').trim();
                                // 保存到内存缓存
                                dateCache[subjectId] = earliestDate;
                                // 保存缓存到localStorage，添加过期时间
                                const cachedData = localStorage.getItem('bangumi_date_cache');
                                let cacheWithExpiry = {};
                                
                                if (cachedData) {
                                    try {
                                        cacheWithExpiry = JSON.parse(cachedData);
                                    } catch (e) {
                        // 静默处理错误
                    }
                                }
                                
                                const expiryTime = Date.now() + CACHE_EXPIRY;
                                cacheWithExpiry[subjectId] = {
                                    value: earliestDate,
                                    expiry: expiryTime
                                };
                                
                                localStorage.setItem('bangumi_date_cache', JSON.stringify(cacheWithExpiry));
                                return earliestDate;
                            }
                        }
                    }
                }
                
                return null;
            } catch (error) {
            return null;
        }
        }
        
        // 解析日期字符串为Date对象
        function parseDate(dateStr) {
            if (!dateStr) return null;
            
            // 处理不同格式的日期字符串
            let dateStrClean = dateStr;
            
            // 移除括号内容（包括半角和全角括号）
            dateStrClean = dateStrClean.replace(/\([^)]*\)|（[^）]*）/g, '').trim();
            
            // 处理中文日期格式
            dateStrClean = dateStrClean.replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '');
            
            // 处理范围日期，取开始日期（只处理包含~或至的情况，避免分割正常的日期格式）
            if (dateStrClean.includes('~') || dateStrClean.includes('至')) {
                const parts = dateStrClean.split(/[~至]/);
                dateStrClean = parts[0].trim();
            }
            
            // 尝试解析日期
            const date = new Date(dateStrClean);
            if (!isNaN(date.getTime())) {
                return date;
            }
            
            // 尝试其他格式解析
            // 处理YYYY格式（只年份）
            const yearMatch = dateStrClean.match(/^\d{4}$/);
            if (yearMatch) {
                return new Date(yearMatch[0], 0, 1); // 1月1日
            }
            
            // 处理YYYY-MM格式
            const yearMonthMatch = dateStrClean.match(/^\d{4}-\d{2}$/);
            if (yearMonthMatch) {
                return new Date(yearMonthMatch[0] + '-01');
            }
            
            // 处理MM-DD格式
            const monthDayMatch = dateStrClean.match(/^\d{2}-\d{2}$/);
            if (monthDayMatch) {
                // 假设是当前年份
                const currentYear = new Date().getFullYear();
                return new Date(`${currentYear}-${monthDayMatch[0]}`);
            }
            
            return null;
        }
        
        // 从链接中提取ID
        function extractIdFromLink(link) {
            const match = link.match(/\/(character|subject)\/(\d+)/);
            return match ? parseInt(match[2]) : 0;
        }
        
        // 排序函数
        async function sortItems() {
            // 先获取所有原始的item元素
            const originalItemsElements = Array.from(document.querySelectorAll('.item'));
            
            // 恢复原始的DOM结构，确保我们总是从干净的状态开始
            originalItemsElements.forEach((item, index) => {
                if (item) {
                    if (currentView === 'work' && workViewOriginalItems[index]) {
                        // 使用作品视图的原始结构
                        item.innerHTML = workViewOriginalItems[index];
                    } else if (roleViewOriginalItems[index]) {
                        // 使用角色视图的原始结构
                        item.innerHTML = roleViewOriginalItems[index];
                    }
                }
            });
            
            // 使用原始的元素数组，确保我们只处理原始的元素
            const itemsArray = originalItemsElements;
            let finalItems = [];
            
            if (currentIdOrder === 'default' && currentDateOrder === 'none') {
                // 已经恢复了原始顺序，直接返回
                return;
            }
            
            if (currentView === 'role') {
                // 角色视图排序
                if (currentDateOrder !== 'none') {
                    // 日期排序：基于角色相关的作品日期，拆分每个作品为独立条目
                    const workItems = [];
                    
                    // 遍历每个角色条目，收集作品信息
                    const workIdsSet = new Set(); // 用于去重
                    itemsArray.forEach(roleItem => {
                        if (!roleItem) return;
                        
                        // 找到角色信息
                        const characterLink = roleItem.querySelector('.innerLeftItem a');
                        const characterImg = roleItem.querySelector('.innerLeftItem img');
                        const characterName = roleItem.querySelector('.innerLeftItem h3 a').textContent;
                        const characterTitle = roleItem.querySelector('.innerLeftItem a').title;
                        // 尝试多种方式获取角色的中文名
                        let characterTip = '';
                        const tipElement = roleItem.querySelector('.innerLeftItem .tip');
                        if (tipElement) {
                            characterTip = `<small class="grey">${tipElement.textContent}</small>`;
                        } else {
                            // 尝试获取small标签
                            const smallElement = roleItem.querySelector('.innerLeftItem small');
                            if (smallElement) {
                                characterTip = smallElement.outerHTML;
                            }
                        }
                        const characterId = extractIdFromLink(characterLink.href);
                        
                        // 找到所有作品信息
                        const workItemsElements = roleItem.querySelectorAll('.innerRightList li');
                        workItemsElements.forEach(workItem => {
                            if (!workItem) return;
                            
                            // 提取作品信息
                            const workLink = workItem.querySelector('a');
                            const workImg = workItem.querySelector('img');
                            const workName = workItem.querySelector('h3 a').textContent;
                            const workTitle = workLink.title;
                            const workBadge = workItem.querySelector('.badge_job') ? workItem.querySelector('.badge_job').outerHTML : '';
                            // 尝试多种方式获取中文名
                            let workGrey = '';
                            const greyElement = workItem.querySelector('.grey');
                            if (greyElement) {
                                workGrey = greyElement.outerHTML;
                            } else {
                                // 尝试获取small标签
                                const smallElement = workItem.querySelector('small');
                                if (smallElement) {
                                    workGrey = smallElement.outerHTML;
                                }
                            }
                            const workId = extractIdFromLink(workLink.href);
                            
                            // 去重：避免重复添加相同的作品
                            const uniqueKey = `${characterId}-${workId}`;
                            if (workIdsSet.has(uniqueKey)) {
                                return;
                            }
                            workIdsSet.add(uniqueKey);
                            
                            // 获取日期信息，优先从data-date属性获取，如果没有则从缓存获取
                            let workDate = workLink.getAttribute('data-date') || '';
                            if (!workDate && dateCache[workId]) {
                                const date = dateCache[workId];
                                const dateObj = parseDate(date);
                                if (dateObj) {
                                    const year = dateObj.getFullYear();
                                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                    const day = String(dateObj.getDate()).padStart(2, '0');
                                    workDate = `${year}-${month}-${day}`;
                                    // 更新data-date属性
                                    workLink.setAttribute('data-date', workDate);
                                }
                            }
                            
                            // 存储作品信息
                            workItems.push({
                                element: roleItem,
                                workId,
                                workLink: workLink.href,
                                workImg: workImg.src,
                                workName,
                                workTitle,
                                workBadge,
                                workGrey,
                                workDate,
                                characterId,
                                characterLink: characterLink.href,
                                characterImg: characterImg.src,
                                characterName,
                                characterTitle,
                                characterTip
                            });
                        });
                    });
                    
                    // 按日期排序，无日期信息的置于底部
                    // 按日期排序，无日期信息的置于底部
                    workItems.sort((a, b) => {
                        const dateA = a.workDate ? new Date(a.workDate) : null;
                        const dateB = b.workDate ? new Date(b.workDate) : null;
                        
                        // 无日期信息的置于底部
                        if (!dateA && !dateB) return 0;
                        if (!dateA) return 1;
                        if (!dateB) return -1;
                        
                        // 确保日期是有效的
                        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                            return 0;
                        }
                        
                        const result = currentDateOrder === 'asc' ? dateA - dateB : dateB - dateA;
                        return result;
                    });
                    
                    // 按角色分组，保持排序顺序
                    const sortedItems = [];
                    let currentGroup = null;
                    
                    workItems.forEach(workItem => {
                        if (!currentGroup || currentGroup.characterId !== workItem.characterId) {
                            // 创建新的分组
                            currentGroup = {
                                characterId: workItem.characterId,
                                characterLink: workItem.characterLink,
                                characterImg: workItem.characterImg,
                                characterName: workItem.characterName,
                                characterTitle: workItem.characterTitle,
                                characterTip: workItem.characterTip,
                                works: []
                            };
                            sortedItems.push(currentGroup);
                        }
                        currentGroup.works.push(workItem);
                    });
                    
                    // 生成排序后的条目（按角色分组）
                    finalItems = [];
                    sortedItems.forEach(group => {
                        // 创建新的条目
                        const newItem = document.createElement('li');
                        newItem.className = 'item clearit';
                        
                        // 构建作品HTML
                        let worksHtml = '';
                        group.works.forEach((work, index) => {
                            // 只有当作品数量大于1且不是最后一个作品时才添加虚线
                            const borderStyle = group.works.length > 1 && index < group.works.length - 1 ? 'border-bottom: 1px dashed #ccc;' : '';
                            
                            worksHtml += `
                                <li class="clearit" style="${borderStyle}">
                                    <a href="${work.workLink}" title="${work.workTitle}" class="subjectCover cover rr" data-date="${work.workDate}">
                                        <img src="${work.workImg}" width="32" alt="${work.workName}" class="cover" height="32">
                                    </a>
                                    <div class="inner">
                                        <h3><a class="l" href="${work.workLink}">${work.workName}</a></h3>
                                        ${work.workBadge}${work.workGrey ? ' ' + work.workGrey : ''}
                                        <span class="badge_job_tip">CV</span>
                                    </div>
                                </li>
                            `;
                        });
                        
                        // 构建新的HTML结构
                        newItem.innerHTML = `
                            <div class="ll innerLeftItem" style="float: left; width: 50%; clear: none; overflow: visible;">
                                <a href="${group.characterLink}" title="${group.characterTitle}" class="avatar ll" style="float: left; margin-right: 8px;">
                                    <img src="${group.characterImg}" height="48" width="48" alt="${group.characterTitle}" class="avatar avatarTop">
                                </a>
                                <div class="inner" style="padding-top: 2px;">
                                    <h3><a class="l" href="${group.characterLink}">${group.characterName}</a></h3>
                                    ${group.characterTip}
                                </div>
                            </div>
                            <ul class="innerRightList rr" style="float: right; width: 50%; clear: none; overflow: visible;">
                                ${worksHtml}
                            </ul>
                        `;
                        
                        finalItems.push(newItem);
                    });
                    
                    // 清空父容器并重新插入
                    if (itemsArray.length > 0 && finalItems.length > 0) {
                        const parent = itemsArray[0].parentNode;
                        if (parent) {
                            parent.innerHTML = '';
                            finalItems.forEach(item => {
                                parent.appendChild(item);
                            });
                        }
                    }
                } else {
                    // 其他排序：基于角色ID，保持原有分组
                    // 过滤掉null元素
                    const validItems = itemsArray.filter(item => item);
                    
                    // ID排序：基于角色ID
                    // 角色视图：按角色ID排序
                    validItems.sort((a, b) => {
                        // 角色视图：获取角色ID
                        const roleLinkA = a.querySelector('.innerLeftItem a');
                        const roleLinkB = b.querySelector('.innerLeftItem a');
                        const idA = roleLinkA ? extractIdFromLink(roleLinkA.href) : 0;
                        const idB = roleLinkB ? extractIdFromLink(roleLinkB.href) : 0;
                        
                        return currentIdOrder === 'asc' ? idA - idB : idB - idA;
                    });
                    
                    // 重新插入排序后的元素
                    if (validItems.length > 0) {
                        const parent = validItems[0].parentNode;
                        if (parent) {
                            // 清空父容器
                            parent.innerHTML = '';
                            // 重新插入元素
                            validItems.forEach(item => {
                                parent.appendChild(item);
                            });
                        }
                    }
                }
            } else {
                // 作品视图排序
                const workInfoList = [];
                
                // 遍历每个角色条目，收集作品信息
                itemsArray.forEach(roleItem => {
                    // 找到角色信息
                    const characterLink = roleItem.querySelector('.innerRightList a');
                    const characterImg = roleItem.querySelector('.innerRightList img');
                    const characterName = roleItem.querySelector('.innerRightList h3 a').textContent;
                    const characterTitle = roleItem.querySelector('.innerRightList a').title;
                    const characterTip = roleItem.querySelector('.innerRightList small') ? roleItem.querySelector('.innerRightList small').outerHTML : '';
                    const characterId = extractIdFromLink(characterLink.href);
                    
                    // 找到所有作品信息（适应不同的元素结构）
                    let workDivs = roleItem.querySelectorAll('.innerLeftItem > div > div');
                    
                    // 如果没有找到，尝试其他选择器
                    if (workDivs.length === 0) {
                        workDivs = roleItem.querySelectorAll('.innerLeftItem div[style*="clear: both"]');
                    }
                    
                    // 如果还是没有找到，尝试直接在innerLeftItem下查找a标签
                    if (workDivs.length === 0) {
                        const workLink = roleItem.querySelector('.innerLeftItem a');
                        if (workLink) {
                            // 这是一个单独的作品条目
                            const workImg = roleItem.querySelector('.innerLeftItem img');
                            const workName = roleItem.querySelector('.innerLeftItem h3 a').textContent;
                            const workTitle = workLink.title;
                            const workBadge = roleItem.querySelector('.innerLeftItem .badge_job') ? roleItem.querySelector('.innerLeftItem .badge_job').outerHTML : '';
                            const workGrey = roleItem.querySelector('.innerLeftItem .grey') ? roleItem.querySelector('.innerLeftItem .grey').outerHTML : '';
                            const workId = extractIdFromLink(workLink.href);
                            
                            // 存储作品信息
                            workInfoList.push({
                                workId,
                                workLink: workLink.href,
                                workImg: workImg.src,
                                workName,
                                workTitle,
                                workBadge,
                                workGrey,
                                characterId,
                                characterLink: characterLink.href,
                                characterImg: characterImg.src,
                                characterName,
                                characterTitle,
                                characterTip,
                                date: null // 后续会填充日期信息
                            });
                        }
                    } else {
                        workDivs.forEach(workDiv => {
                            // 提取作品信息
                            const workLink = workDiv.querySelector('a');
                            const workImg = workDiv.querySelector('img');
                            const workName = workDiv.querySelector('h3 a').textContent;
                            const workTitle = workLink.title;
                            const workBadge = workDiv.querySelector('.badge_job') ? workDiv.querySelector('.badge_job').outerHTML : '';
                            const workGrey = workDiv.querySelector('.grey') ? workDiv.querySelector('.grey').outerHTML : '';
                            const workId = extractIdFromLink(workLink.href);
                            
                            // 存储作品信息
                            workInfoList.push({
                                workId,
                                workLink: workLink.href,
                                workImg: workImg.src,
                                workName,
                                workTitle,
                                workBadge,
                                workGrey,
                                characterId,
                                characterLink: characterLink.href,
                                characterImg: characterImg.src,
                                characterName,
                                characterTitle,
                                characterTip,
                                date: null // 后续会填充日期信息
                            });
                        });
                    }
                });
                
                // 初始化finalItems数组
                let finalItems = [];
                
                if (currentDateOrder !== 'none') {
                    // 日期排序：基于作品链接的data-date属性
                    const workItems = [];
                    const workIdsSet = new Set(); // 用于去重
                    
                    // 遍历每个角色条目，收集作品信息
                    itemsArray.forEach(roleItem => {
                        // 找到角色信息
                        const characterLink = roleItem.querySelector('.innerRightList a');
                        const characterImg = roleItem.querySelector('.innerRightList img');
                        const characterName = roleItem.querySelector('.innerRightList h3 a').textContent;
                        const characterTitle = roleItem.querySelector('.innerRightList a').title;
                        const characterTip = roleItem.querySelector('.innerRightList small') ? roleItem.querySelector('.innerRightList small').outerHTML : '';
                        const characterId = extractIdFromLink(characterLink.href);
                        
                        // 找到所有作品信息（适应不同的元素结构）
                        let workDivs = roleItem.querySelectorAll('.innerLeftItem > div > div');
                        
                        // 如果没有找到，尝试其他选择器
                        if (workDivs.length === 0) {
                            workDivs = roleItem.querySelectorAll('.innerLeftItem div[style*="clear: both"]');
                        }
                        
                        // 如果还是没有找到，尝试直接在innerLeftItem下查找a标签
                        if (workDivs.length === 0) {
                            const workLink = roleItem.querySelector('.innerLeftItem a');
                            if (workLink) {
                                // 这是一个单独的作品条目
                                const workImg = roleItem.querySelector('.innerLeftItem img');
                                const workName = roleItem.querySelector('.innerLeftItem h3 a').textContent;
                                const workTitle = workLink.title;
                                const workBadge = roleItem.querySelector('.innerLeftItem .badge_job') ? roleItem.querySelector('.innerLeftItem .badge_job').outerHTML : '';
                                const workGrey = roleItem.querySelector('.innerLeftItem .grey') ? roleItem.querySelector('.innerLeftItem .grey').outerHTML : '';
                                const workId = extractIdFromLink(workLink.href);
                                const workDate = workLink.getAttribute('data-date') || '';
                                
                                // 去重：避免重复添加相同的作品
                            const uniqueKey = `${workId}-${characterId}`;
                            if (!workIdsSet.has(uniqueKey)) {
                                workIdsSet.add(uniqueKey);
                                // 存储作品信息
                                workItems.push({
                                    element: roleItem,
                                    workId,
                                    workLink: workLink.href,
                                    workImg: workImg.src,
                                    workName,
                                    workTitle,
                                    workBadge,
                                    workGrey,
                                    workDate,
                                    characterId,
                                    characterLink: characterLink.href,
                                    characterImg: characterImg.src,
                                    characterName,
                                    characterTitle,
                                    characterTip
                                });
                            }
                            }
                        } else {
                            workDivs.forEach(workDiv => {
                                // 提取作品信息
                                const workLink = workDiv.querySelector('a');
                                const workImg = workDiv.querySelector('img');
                                const workName = workDiv.querySelector('h3 a').textContent;
                                const workTitle = workLink.title;
                                const workBadge = workDiv.querySelector('.badge_job') ? workDiv.querySelector('.badge_job').outerHTML : '';
                                const workGrey = workDiv.querySelector('.grey') ? workDiv.querySelector('.grey').outerHTML : '';
                                const workId = extractIdFromLink(workLink.href);
                                const workDate = workLink.getAttribute('data-date') || '';
                                
                                // 去重：避免重复添加相同的作品
                            const uniqueKey = `${workId}-${characterId}`;
                            if (!workIdsSet.has(uniqueKey)) {
                                workIdsSet.add(uniqueKey);
                                // 存储作品信息
                                workItems.push({
                                    element: roleItem,
                                    workId,
                                    workLink: workLink.href,
                                    workImg: workImg.src,
                                    workName,
                                    workTitle,
                                    workBadge,
                                    workGrey,
                                    workDate,
                                    characterId,
                                    characterLink: characterLink.href,
                                    characterImg: characterImg.src,
                                    characterName,
                                    characterTitle,
                                    characterTip
                                });
                            }
                            });
                        }
                    });
                    
                    // 按日期排序，无日期信息的置于底部
                    workItems.sort((a, b) => {
                        const dateA = a.workDate ? new Date(a.workDate) : null;
                        const dateB = b.workDate ? new Date(b.workDate) : null;
                        
                        // 无日期信息的置于底部
                        if (!dateA && !dateB) return 0;
                        if (!dateA) return 1;
                        if (!dateB) return -1;
                        
                        return currentDateOrder === 'asc' ? dateA - dateB : dateB - dateA;
                    });
                    
                    // 按角色分组，保持排序顺序
                    const sortedItems = [];
                    let currentGroup = null;
                    
                    workItems.forEach(workItem => {
                        if (!currentGroup || currentGroup.characterId !== workItem.characterId) {
                            // 创建新的分组
                            currentGroup = {
                                characterId: workItem.characterId,
                                characterLink: workItem.characterLink,
                                characterImg: workItem.characterImg,
                                characterName: workItem.characterName,
                                characterTitle: workItem.characterTitle,
                                characterTip: workItem.characterTip,
                                works: []
                            };
                            sortedItems.push(currentGroup);
                        }
                        currentGroup.works.push(workItem);
                    });
                    
                    // 生成排序后的条目
                    finalItems = [];
                    sortedItems.forEach(group => {
                        // 创建新的条目
                        const newItem = document.createElement('li');
                        newItem.className = 'item clearit';
                        
                        // 构建作品HTML
                        let worksHtml = '';
                        group.works.forEach((work, index) => {
                            // 只有当作品数量大于1且不是最后一个作品时才添加虚线
                            const borderStyle = group.works.length > 1 && index < group.works.length - 1 ? 'border-bottom: 1px dashed #ccc;' : '';
                            
                            worksHtml += `
                                <div style="clear: both; overflow: hidden; padding: 3px 0; ${borderStyle}">
                                    <a href="${work.workLink}" title="${work.workTitle}" class="avatar ll" style="float: left; margin-right: 8px;" data-date="${work.workDate}">
                                        <img src="${work.workImg}" height="48" width="48" alt="${work.workTitle}" class="avatar avatarTop">
                                    </a>
                                    <div class="inner" style="padding-top: 2px;">
                                        <h3><a class="l" href="${work.workLink}">${work.workName}</a></h3>
                                        ${work.workBadge} ${work.workGrey || ''}
                                    </div>
                                </div>
                            `;
                        });
                        
                        // 构建新的HTML结构
                        newItem.innerHTML = `
                            <div class="ll innerLeftItem" style="float: left; width: 50%; clear: none; overflow: visible;">
                                <div style="clear: both; overflow: visible;">
                                    ${worksHtml}
                                </div>
                            </div>
                            <ul class="innerRightList rr" style="float: right; width: 50%; clear: none; overflow: visible;">
                                <li class="clearit">
                                    <a href="${group.characterLink}" title="${group.characterTitle}" class="subjectCover cover rr">
                                        <img src="${group.characterImg}" width="32" alt="${group.characterName}" class="cover" height="32">
                                    </a>
                                    <div class="inner">
                                        <h3><a class="l" href="${group.characterLink}">${group.characterName}</a></h3>
                                        ${group.characterTip}
                                        <span class="badge_job_tip">CV</span>
                                    </div>
                                </li>
                            </ul>
                        `;
                        
                        finalItems.push(newItem);
                    });
                } else {
                    // 按作品ID排序
                    // 为每个作品创建独立的条目
                    const workItems = [];
                    const workIdsSet = new Set(); // 用于去重
                    
                    // 遍历每个角色条目，收集作品信息
                    itemsArray.forEach(roleItem => {
                        // 找到角色信息
                        const characterLink = roleItem.querySelector('.innerRightList a');
                        const characterImg = roleItem.querySelector('.innerRightList img');
                        const characterName = roleItem.querySelector('.innerRightList h3 a').textContent;
                        const characterTitle = roleItem.querySelector('.innerRightList a').title;
                        const characterTip = roleItem.querySelector('.innerRightList small') ? roleItem.querySelector('.innerRightList small').outerHTML : '';
                        const characterId = extractIdFromLink(characterLink.href);
                        
                        // 找到所有作品信息（适应不同的元素结构）
                        let workDivs = roleItem.querySelectorAll('.innerLeftItem > div > div');
                        
                        // 如果没有找到，尝试其他选择器
                        if (workDivs.length === 0) {
                            workDivs = roleItem.querySelectorAll('.innerLeftItem div[style*="clear: both"]');
                        }
                        
                        // 如果还是没有找到，尝试直接在innerLeftItem下查找a标签
                        if (workDivs.length === 0) {
                            const workLink = roleItem.querySelector('.innerLeftItem a');
                            if (workLink) {
                                // 这是一个单独的作品条目
                                const workImg = roleItem.querySelector('.innerLeftItem img');
                                const workName = roleItem.querySelector('.innerLeftItem h3 a').textContent;
                                const workTitle = workLink.title;
                                const workBadge = roleItem.querySelector('.innerLeftItem .badge_job') ? roleItem.querySelector('.innerLeftItem .badge_job').outerHTML : '';
                                const workGrey = roleItem.querySelector('.innerLeftItem .grey') ? roleItem.querySelector('.innerLeftItem .grey').outerHTML : '';
                                const workId = extractIdFromLink(workLink.href);
                                const workDate = workLink.getAttribute('data-date') || '';
                                
                                // 去重：避免重复添加相同的作品
                            const uniqueKey = `${workId}-${characterId}`;
                            if (!workIdsSet.has(uniqueKey)) {
                                workIdsSet.add(uniqueKey);
                                // 存储作品信息
                                workItems.push({
                                    element: roleItem,
                                    workId,
                                    workLink: workLink.href,
                                    workImg: workImg.src,
                                    workName,
                                    workTitle,
                                    workBadge,
                                    workGrey,
                                    workDate,
                                    characterId,
                                    characterLink: characterLink.href,
                                    characterImg: characterImg.src,
                                    characterName,
                                    characterTitle,
                                    characterTip
                                });
                            }
                            }
                        } else {
                            workDivs.forEach(workDiv => {
                                // 提取作品信息
                                const workLink = workDiv.querySelector('a');
                                const workImg = workDiv.querySelector('img');
                                const workName = workDiv.querySelector('h3 a').textContent;
                                const workTitle = workLink.title;
                                const workBadge = workDiv.querySelector('.badge_job') ? workDiv.querySelector('.badge_job').outerHTML : '';
                                const workGrey = workDiv.querySelector('.grey') ? workDiv.querySelector('.grey').outerHTML : '';
                                const workId = extractIdFromLink(workLink.href);
                                const workDate = workLink.getAttribute('data-date') || '';
                                
                                // 去重：避免重复添加相同的作品
                            const uniqueKey = `${workId}-${characterId}`;
                            if (!workIdsSet.has(uniqueKey)) {
                                workIdsSet.add(uniqueKey);
                                // 存储作品信息
                                workItems.push({
                                    element: roleItem,
                                    workId,
                                    workLink: workLink.href,
                                    workImg: workImg.src,
                                    workName,
                                    workTitle,
                                    workBadge,
                                    workGrey,
                                    workDate,
                                    characterId,
                                    characterLink: characterLink.href,
                                    characterImg: characterImg.src,
                                    characterName,
                                    characterTitle,
                                    characterTip
                                });
                            }
                            });
                        }
                    });
                    
                    // 按作品ID排序
                    workItems.sort((a, b) => {
                        return currentIdOrder === 'asc' ? a.workId - b.workId : b.workId - a.workId;
                    });
                    
                    // 按角色分组，保持排序顺序
                    const sortedItems = [];
                    let currentGroup = null;
                    
                    workItems.forEach(workItem => {
                        if (!currentGroup || currentGroup.characterId !== workItem.characterId) {
                            // 创建新的分组
                            currentGroup = {
                                characterId: workItem.characterId,
                                characterLink: workItem.characterLink,
                                characterImg: workItem.characterImg,
                                characterName: workItem.characterName,
                                characterTitle: workItem.characterTitle,
                                characterTip: workItem.characterTip,
                                works: []
                            };
                            sortedItems.push(currentGroup);
                        }
                        currentGroup.works.push(workItem);
                    });
                    
                    // 生成排序后的条目
                    finalItems = [];
                    sortedItems.forEach(group => {
                        // 创建新的条目
                        const newItem = document.createElement('li');
                        newItem.className = 'item clearit';
                        
                        // 构建作品HTML
                        let worksHtml = '';
                        group.works.forEach((work, index) => {
                            // 只有当作品数量大于1且不是最后一个作品时才添加虚线
                            const borderStyle = group.works.length > 1 && index < group.works.length - 1 ? 'border-bottom: 1px dashed #ccc;' : '';
                            
                            worksHtml += `
                                <div style="clear: both; overflow: hidden; padding: 3px 0; ${borderStyle}">
                                    <a href="${work.workLink}" title="${work.workTitle}" class="avatar ll" style="float: left; margin-right: 8px;" data-date="${work.workDate}">
                                        <img src="${work.workImg}" height="48" width="48" alt="${work.workTitle}" class="avatar avatarTop">
                                    </a>
                                    <div class="inner" style="padding-top: 2px;">
                                        <h3><a class="l" href="${work.workLink}">${work.workName}</a></h3>
                                        ${work.workBadge} ${work.workGrey || ''}
                                    </div>
                                </div>
                            `;
                        });
                        
                        // 构建新的HTML结构
                        newItem.innerHTML = `
                            <div class="ll innerLeftItem" style="float: left; width: 50%; clear: none; overflow: visible;">
                                <div style="clear: both; overflow: visible;">
                                    ${worksHtml}
                                </div>
                            </div>
                            <ul class="innerRightList rr" style="float: right; width: 50%; clear: none; overflow: visible;">
                                <li class="clearit">
                                    <a href="${group.characterLink}" title="${group.characterTitle}" class="subjectCover cover rr">
                                        <img src="${group.characterImg}" width="32" alt="${group.characterName}" class="cover" height="32">
                                    </a>
                                    <div class="inner">
                                        <h3><a class="l" href="${group.characterLink}">${group.characterName}</a></h3>
                                        ${group.characterTip}
                                        <span class="badge_job_tip">CV</span>
                                    </div>
                                </li>
                            </ul>
                        `;
                        
                        finalItems.push(newItem);
                    });
                }
                
                // 清空父容器并重新插入
                if (itemsArray.length > 0 && finalItems.length > 0) {
                    const parent = itemsArray[0].parentNode;
                    if (parent) {
                        parent.innerHTML = '';
                        finalItems.forEach(item => {
                            parent.appendChild(item);
                        });
                    }
                }
            }
        }
        
        // 切换到角色视图
        function switchToRoleView() {
            const items = document.querySelectorAll('.item');
            
            // 保存当前的作品视图状态，以便下次切换回来时保持
            const currentWorkItems = [];
            items.forEach(item => {
                currentWorkItems.push(item.innerHTML);
            });
            workViewOriginalItems = currentWorkItems;
            
            // 恢复角色视图
            items.forEach((item, index) => {
                if (roleViewOriginalItems[index]) {
                    item.innerHTML = roleViewOriginalItems[index];
                }
            });
        }
        
        // 切换到作品视图
        function switchToWorkView() {
            const items = document.querySelectorAll('.item');
            const newWorkViewItems = [];
            
            items.forEach(item => {
                if (!item) return;
                
                // 允许撑开li元素
                item.style.clear = 'both';
                item.style.overflow = 'visible';
                item.style.height = 'auto';
                
                // 找到角色信息和作品信息
                const innerLeftItem = item.querySelector('.innerLeftItem');
                const innerRightList = item.querySelector('.innerRightList');
                
                if (innerLeftItem && innerRightList) {
                    // 提取角色信息
                    const characterNameElement = innerLeftItem.querySelector('h3 a');
                    const characterImgElement = innerLeftItem.querySelector('img');
                    const characterTitleElement = innerLeftItem.querySelector('a');
                    
                    if (!characterNameElement || !characterImgElement || !characterTitleElement) return;
                    
                    const characterName = characterNameElement.textContent;
                    const characterLink = characterNameElement.href;
                    const characterImg = characterImgElement.src;
                    const characterTitle = characterTitleElement.title;
                    const characterTipElement = innerLeftItem.querySelector('.tip');
                    const characterTip = characterTipElement ? `<small class="grey">${characterTipElement.textContent}</small>` : '';
                    
                    // 提取作品信息
                    const workItems = innerRightList.querySelectorAll('li');
                    let workHtml = '';
                    workItems.forEach((workItem, index) => {
                        if (!workItem) return;
                        
                        const workNameElement = workItem.querySelector('h3 a');
                        const workImgElement = workItem.querySelector('img');
                        const workTitleElement = workItem.querySelector('a');
                        
                        if (!workNameElement || !workImgElement || !workTitleElement) return;
                        
                        const workName = workNameElement.textContent;
                        const workLink = workNameElement.href;
                        const workImg = workImgElement.src;
                        const workTitle = workTitleElement.title;
                        const workBadge = workItem.querySelector('.badge_job') ? workItem.querySelector('.badge_job').outerHTML : '';
                        const workTip = workItem.querySelector('.badge_job_tip') ? workItem.querySelector('.badge_job_tip').outerHTML : '';
                        const workGrey = workItem.querySelector('.grey') ? workItem.querySelector('.grey').outerHTML : '';
                        
                        // 提取作品ID并获取日期信息
                        const workId = extractIdFromLink(workLink);
                        let workDate = '';
                        if (workId) {
                            // 从缓存中获取日期信息
                            if (dateCache[workId]) {
                                const date = dateCache[workId];
                                const dateObj = parseDate(date);
                                if (dateObj) {
                                    const year = dateObj.getFullYear();
                                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                    const day = String(dateObj.getDate()).padStart(2, '0');
                                    workDate = `${year}-${month}-${day}`;
                                }
                            }
                        }
                        
                        // 只有当作品数量大于1且不是最后一个作品时才添加虚线
                        const borderStyle = workItems.length > 1 && index < workItems.length - 1 ? 'border-bottom: 1px dashed #ccc;' : '';
                        
                        workHtml += `
                            <div style="clear: both; overflow: hidden; padding: 3px 0; ${borderStyle}">
                                <a href="${workLink}" title="${workTitle}" class="avatar ll" style="float: left; margin-right: 8px;" data-date="${workDate}">
                                    <img src="${workImg}" height="48" width="48" alt="${workTitle}" class="avatar avatarTop">
                                </a>
                                <div class="inner" style="padding-top: 2px;">
                                    <h3><a class="l" href="${workLink}">${workName}</a></h3>
                                    ${workBadge} ${workGrey}
                                </div>
                            </div>
                        `;
                    });
                    
                    // 构建新的HTML结构
                    const newHtml = `
                        <div class="ll innerLeftItem" style="float: left; width: 50%; clear: none; overflow: visible;">
                            <div style="clear: both; overflow: visible;">
                                ${workHtml}
                            </div>
                        </div>
                        <ul class="innerRightList rr" style="float: right; width: 50%; clear: none; overflow: visible;">
                            <li class="clearit">
                                <a href="${characterLink}" title="${characterTitle}" class="subjectCover cover rr">
                                    <img src="${characterImg}" width="32" alt="${characterName}" class="cover" height="32">
                                </a>
                                <div class="inner">
                                    <h3><a class="l" href="${characterLink}">${characterName}</a></h3>
                                    ${characterTip}
                                    <span class="badge_job_tip">CV</span>
                                </div>
                            </li>
                        </ul>
                    `;
                    
                    // 更新item内容
                    item.innerHTML = newHtml;
                    newWorkViewItems.push(newHtml);
                    

                }
            });
            
            // 保存作品视图的原始结构
            workViewOriginalItems = newWorkViewItems;
        }
        
        // 切换函数
        async function switchView(view) {
            // 如果当前已经是目标视图，直接返回，避免重复操作
            if (currentView === view) {
                return;
            }
            
            // 保存当前排序状态
            const previousIdOrder = currentIdOrder;
            
            // 先更新状态
            currentView = view;
            
            // 重置排序状态
            currentIdOrder = 'default';
            currentDateOrder = 'none';
            
            // 更新链接样式
            updateLinkStyles();
            updateIdOrderStyles();
            updateDateOrderStyles();

            // 显示日期序控制（在角色和作品视图下都显示）
            dateOrderUl.style.display = 'block';
            
            // 切换视图
            if (view === 'work') {
                switchToWorkView();
            } else {
                switchToRoleView();
            }
            
            // 恢复之前的排序状态
            if (previousIdOrder !== 'default') {
                currentIdOrder = previousIdOrder;
                updateIdOrderStyles();
                sortItems('id');
            }
        }
        
        // 切换ID序函数
        async function switchIdOrder(order) {
            // 如果当前已经是目标顺序，直接返回，避免重复操作
            if (currentIdOrder === order) {
                return;
            }
            
            // 先更新状态
            currentIdOrder = order;
            // 重置日期序状态
            currentDateOrder = 'none';
            
            // 更新链接样式
            updateIdOrderStyles();
            updateDateOrderStyles();
            
            // 执行排序
            await sortItems();
        }
        
        // 切换日期序函数
        async function switchDateOrder(order) {
            // 如果当前已经是目标顺序，直接返回，避免重复操作
            if (currentDateOrder === order) {
                return;
            }
            
            // 先更新状态
            currentDateOrder = order;
            // 重置ID序状态
            currentIdOrder = 'default';
            
            // 更新链接样式
            updateIdOrderStyles();
            updateDateOrderStyles();
            
            // 显示加载状态
            const parent = document.querySelector('.subjectFilter').parentNode;
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 9999;
            `;
            loadingDiv.textContent = '正在加载日期信息...';
            document.body.appendChild(loadingDiv);
            
            try {
                // 执行排序
                await sortItems();
            } finally {
                // 移除加载状态
                document.body.removeChild(loadingDiv);
            }
        }

        // 添加点击事件
        roleLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchView('role');
        });

        workLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchView('work');
        });
        
        // 添加ID序点击事件
        defaultLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchIdOrder('default');
        });
        
        ascLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchIdOrder('asc');
        });
        
        descLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchIdOrder('desc');
        });
        
        // 添加日期序点击事件
        dateDefaultLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchDateOrder('none');
        });
        
        dateAscLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchDateOrder('asc');
        });
        
        dateDescLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await switchDateOrder('desc');
        });

    }

    // 等待页面加载完成
    waitForElement('.subjectFilter', init);

})();