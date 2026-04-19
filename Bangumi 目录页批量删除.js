// ==UserScript==
// @name         Bangumi 目录页批量删除
// @version      1.0
// @description  在 Bangumi 目录页添加批量删除条目/角色的按钮
// @author       Sumora
// @match        https://bangumi.tv/index/*
// @match        https://bgm.tv/index/*
// @match        https://chii.in/index/*
// @match        http://bangumi.tv/index/*
// @match        http://bgm.tv/index/*
// @match        http://chii.in/index/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .bgm-batch-delete-container {
            padding: 8px;
            margin: 8px 0;
            background: #f5f5f5;
            border-radius: 4px;
            display: block;
            clear: both;
            overflow: hidden;
        }
        /* 关灯模式适配 */
        body.dark-mode .bgm-batch-delete-container,
        html[data-theme="dark"] .bgm-batch-delete-container,
        .theme-dark .bgm-batch-delete-container {
            background: #2a2a2a;
        }
        .bgm-batch-delete-btn {
            background: #ff4444;
            color: white;
            border: none;
            padding: 4px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 8px;
        }
        .bgm-batch-delete-btn:hover {
            background: #cc0000;
        }
        .bgm-item-checkbox {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 18px;
            height: 18px;
            cursor: pointer;
            z-index: 10;
        }
        .bgm-delete-all-btn {
            background: #ff6666;
            color: white;
            border: none;
            padding: 4px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 8px;
        }
        .bgm-delete-all-btn:hover {
            background: #ff3333;
        }
        .bgm-delete-all-btn:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        /* 关灯模式下禁用按钮样式 */
        body.dark-mode .bgm-delete-all-btn:disabled,
        html[data-theme="dark"] .bgm-delete-all-btn:disabled,
        .theme-dark .bgm-delete-all-btn:disabled {
            background: #555555;
        }
        .light_even, .light_odd {
            position: relative;
        }
        /* 为div.item.clearit和li.row添加相对定位，使复选框能正确定位 */
        div.item.clearit, li.row, li.item {
            position: relative;
        }
        /* 复选框在暗色模式下的样式 */
        body.dark-mode .bgm-item-checkbox,
        html[data-theme="dark"] .bgm-item-checkbox,
        .theme-dark .bgm-item-checkbox {
            accent-color: #ff4444;
        }
    `;
    document.head.appendChild(style);

    // 为每个条目添加复选框
    function addCheckboxes() {
        // 支持多种条目类型：id以item_开头的、div.item、li.row
        const selectors = [
            '[id^="item_"]',           // 原始选择器
            'div.item.clearit',         // div类型的条目
            'li.row'                    // li类型的条目
        ];

        let items = [];
        selectors.forEach(selector => {
            items = items.concat(Array.from(document.querySelectorAll(selector)));
        });

        items.forEach(item => {
            if (item.querySelector('.bgm-item-checkbox')) return;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'bgm-item-checkbox';

            // 获取条目ID：优先使用attr-index-related属性，其次是id
            const itemId = item.getAttribute('attr-index-related') || item.id;
            if (!itemId) return; // 如果没有ID则跳过

            checkbox.dataset.itemId = itemId;
            item.appendChild(checkbox);
        });
    }

    // 获取删除链接
    function getDeleteUrl(item) {
        const deleteLink = item.querySelector('a[href*="/erase"]');
        if (deleteLink) {
            return deleteLink.href;
        }
        return null;
    }

    // 根据ID查找条目元素
    function findItemById(itemId) {
        // 优先通过attr-index-related属性查找
        let item = document.querySelector(`[attr-index-related="${itemId}"]`);
        if (item) return item;

        // 其次通过id查找
        item = document.getElementById(itemId);
        if (item) return item;

        // 最后尝试查找包含该ID的checkbox对应的条目
        const checkbox = document.querySelector(`.bgm-item-checkbox[data-item-id="${itemId}"]`);
        if (checkbox) return checkbox.parentElement;

        return null;
    }

    // 删除单个条目（使用 XMLHttpRequest 提高速度）
    function deleteItem(itemId) {
        return new Promise((resolve) => {
            const item = findItemById(itemId);
            if (!item) {
                resolve({ success: false, error: '条目不存在' });
                return;
            }

            const deleteUrl = getDeleteUrl(item);
            if (!deleteUrl) {
                resolve({ success: false, error: '未找到删除链接' });
                return;
            }

            const xhr = new XMLHttpRequest();
            xhr.open('GET', deleteUrl, true);
            xhr.withCredentials = true;

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 400) {
                    item.remove();
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: `HTTP ${xhr.status}` });
                }
            };

            xhr.onerror = () => resolve({ success: false, error: '网络错误' });
            xhr.ontimeout = () => resolve({ success: false, error: '请求超时' });
            xhr.timeout = 10000;

            xhr.send();
        });
    }

    // 批量删除选中的条目（并行处理）
    async function deleteSelected() {
        const checkboxes = document.querySelectorAll('.bgm-item-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('请先选择要删除的条目');
            return;
        }

        if (!confirm(`确定要删除选中的 ${checkboxes.length} 个条目吗？`)) {
            return;
        }

        const deleteAllBtn = document.querySelector('.bgm-delete-all-btn');
        deleteAllBtn.disabled = true;
        deleteAllBtn.textContent = `删除中 (0/${checkboxes.length})...`;

        let successCount = 0;
        let failCount = 0;
        const errors = [];
        let completedCount = 0;

        // 更新按钮文本显示进度
        const updateProgress = () => {
            completedCount++;
            deleteAllBtn.textContent = `删除中 (${completedCount}/${checkboxes.length})...`;
        };

        // 并发控制：限制同时进行的请求数量
        const CONCURRENT_LIMIT = 50;
        const itemIds = Array.from(checkboxes).map(cb => cb.dataset.itemId);

        // 分批处理，每批并发执行
        for (let i = 0; i < itemIds.length; i += CONCURRENT_LIMIT) {
            const batch = itemIds.slice(i, i + CONCURRENT_LIMIT);

            // 并行执行当前批次的删除请求
            const batchPromises = batch.map(async (itemId) => {
                const result = await deleteItem(itemId);
                updateProgress();

                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    errors.push(`${itemId}: ${result.error}`);
                }
                return result;
            });

            // 等待当前批次完成（不等待直接发送下一批，最大化并发）
            await Promise.all(batchPromises);
        }

        deleteAllBtn.disabled = false;
        deleteAllBtn.textContent = '删除选中项';

        let message = `删除完成！\n成功: ${successCount}\n失败: ${failCount}`;
        if (errors.length > 0) {
            message += '\n\n错误详情:\n' + errors.slice(0, 5).join('\n');
            if (errors.length > 5) {
                message += `\n...还有 ${errors.length - 5} 个错误`;
            }
        }
        alert(message);

        // 删除完成后自动刷新页面
        if (successCount > 0) {
            window.location.reload();
        }
    }

    // 创建批量删除按钮
    function createButtons() {
        // 查找 .segment-container，将按钮插入到它后面
        const segmentContainer = document.querySelector('.segment-container');

        // 如果未找到元素则不插入按钮
        if (!segmentContainer || !segmentContainer.parentNode) {
            console.log('[Bangumi批量删除] 未找到 .segment-container 元素，跳过插入按钮');
            return;
        }

        // 创建容器 div
        const container = document.createElement('div');
        container.className = 'bgm-batch-delete-container';

        // 添加标题
        const title = document.createElement('span');
        title.textContent = '批量操作: ';
        title.style.cssText = 'font-weight: bold; margin-right: 10px;';
        container.appendChild(title);

        // 全选/取消全选按钮
        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'bgm-batch-delete-btn';
        selectAllBtn.textContent = '全选';
        selectAllBtn.style.cssText = 'background: #ff4444; color: white; border: none; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-right: 8px;'
        selectAllBtn.onclick = () => {
            const checkboxes = document.querySelectorAll('.bgm-item-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            selectAllBtn.textContent = allChecked ? '全选' : '取消全选';
        };
        container.appendChild(selectAllBtn);

        // 删除选中项按钮
        const deleteAllBtn = document.createElement('button');
        deleteAllBtn.className = 'bgm-delete-all-btn';
        deleteAllBtn.textContent = '删除选中项';
        deleteAllBtn.style.cssText = 'background: #ff6666; color: white; border: none; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 12px;'
        deleteAllBtn.onclick = deleteSelected;
        container.appendChild(deleteAllBtn);

        // 插入到 .segment-container 后面
        segmentContainer.parentNode.insertBefore(container, segmentContainer.nextSibling);
    }

    // 初始化
    function init() {
        addCheckboxes();
        createButtons();

        // 监听页面变化（用于处理动态加载的内容）
        const observer = new MutationObserver(() => {
            addCheckboxes();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
