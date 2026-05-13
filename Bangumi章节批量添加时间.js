// ==UserScript==
// @name        Bangumi章节批量添加时间
// @namespace   http://tampermonkey.net/
// @version     2.5
// @description Bangumi 章节批量添加时间
// @include     /^https?:\/\/(bangumi\.tv|bgm\.tv|chii\.in)\/subject\/.*\/ep\/.*/
// @include     /^https?:\/\/(bangumi\.tv|bgm\.tv|chii\.in)\/subject\/.*\/ep\/create/
// @include     /^https?:\/\/(bangumi\.tv|bgm\.tv|chii\.in)\/ep\/\d+\/edit/
// @author      墨云
// @grant       none
// @license     MIT
// ==/UserScript==

(function () {
  'use strict';

  function waitForEl(selector, cb, interval = 300, timeout = 10000) {
    const start = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        cb(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
      }
    }, interval);
  }

  waitForEl('div.markItUpHeader', function (toolbarToRemove) {
    if (toolbarToRemove) {
      toolbarToRemove.remove();
    }
  });

  function isDarkMode() {
    const dataTheme = document.documentElement.getAttribute('data-theme');
    return dataTheme === 'dark' || 
           document.documentElement.classList.contains('night') || 
           document.body.classList.contains('dark') ||
           window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getModeColor() {
    if (isDarkMode()) {
      return {
        text: '#e0e0e0',
        background: '#1f1f1f',
        primary: '#f6a1b2',
        secondary: '#4CAF50',
        border: '#333',
        calendar: '#F09100'
      };
    }
    return {
      text: '#333',
      background: '#f7f7f7',
      primary: '#f6a1b2',
      secondary: '#4CAF50',
      border: '#ddd',
      calendar: '#F09100'
    };
  }

  function createCalendarIcon() {
    const colors = getModeColor();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", colors.calendar);
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.cssText = "vertical-align: middle; margin-right: 5px;";
    
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "3");
    rect.setAttribute("y", "4");
    rect.setAttribute("width", "18");
    rect.setAttribute("height", "18");
    rect.setAttribute("rx", "2");
    rect.setAttribute("ry", "2");
    svg.appendChild(rect);
    
    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", "16");
    line1.setAttribute("y1", "2");
    line1.setAttribute("x2", "16");
    line1.setAttribute("y2", "6");
    svg.appendChild(line1);

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "8");
    line2.setAttribute("y1", "2");
    line2.setAttribute("x2", "8");
    line2.setAttribute("y2", "6");
    svg.appendChild(line2);
    
    const line3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line3.setAttribute("x1", "3");
    line3.setAttribute("y1", "10");
    line3.setAttribute("x2", "21");
    line3.setAttribute("y2", "10");
    svg.appendChild(line3);

    return svg;
  }

  function createModal(onConfirm) {
    const darkMode = isDarkMode();
    const colors = getModeColor();
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    const modal = document.createElement('div');
    const bgColor = darkMode ? '#1a1a1a' : '#f7f7f7';
    const textColor = darkMode ? '#e0e0e0' : '#333';
    modal.style.cssText = `
      background: ${bgColor} !important;
      padding: 25px;
      border-radius: 10px;
      min-width: 350px;
      max-width: 90%;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      color: ${textColor} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      * { color: ${textColor} !important; }
      input, select { background: ${darkMode ? '#2a2a2a' : '#fff'} !important; border: 1px solid ${darkMode ? '#444' : '#ddd'} !important; color: ${textColor} !important; }
      button { background: ${darkMode ? '#333' : '#f7f7f7'} !important; color: ${textColor} !important; }
    `;
    overlay.appendChild(modal);

    const title = document.createElement('h3');
    title.textContent = "批量添加章节日期";
    title.style.cssText = `text-align: center; margin-bottom: 20px; color: ${colors.text}; border-bottom: 1px solid ${colors.border}; padding-bottom: 10px;`;
    modal.appendChild(title);

    const createInputGroup = (label, htmlContent) => {
        const div = document.createElement('div');
        div.style.cssText = `margin-bottom: 15px; font-size: 14px; font-weight: 500; color: ${colors.text};`;
        div.innerHTML = `<div>${label}</div>${htmlContent}`;
        return div;
    };
    
    const inputBg = darkMode ? '#2a2a2a' : '#fff';
    const inputText = darkMode ? '#e0e0e0' : '#333';
    const inputBorder = darkMode ? '#444' : '#ddd';
    const inputStyle = `width:100%; box-sizing: border-box; padding: 10px; border: 1px solid ${inputBorder}; border-radius: 6px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.06); outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; font-size: 14px; background: ${inputBg} !important; color: ${inputText} !important;`;
    const focusInputStyle = `border-color: ${colors.primary}; box-shadow: 0 0 0 2px rgba(246, 161, 178, 0.2);`;

    const startEpDiv = createInputGroup(
      '从第几集开始（选填）:',
      `<input type="number" min="1" placeholder="留空则从当前第一个开始" style="${inputStyle}"/>`
    );
    startEpDiv.querySelector('input').addEventListener('focus', (e) => e.target.style.cssText += focusInputStyle);
    startEpDiv.querySelector('input').addEventListener('blur', (e) => e.target.style.cssText = inputStyle);

    const autoBtnBg = darkMode ? '#4CAF50' : '#4CAF50';
    const dateInputDiv = createInputGroup(
      '选择日期:',
      `<div style="display: flex; gap: 10px;">
        <input type="date" style="${inputStyle}; flex: 1;"/>
        <button type="button" title="识别开播日期" style="padding: 0 15px; background-color: #f6a1b2; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: bold; letter-spacing: 1px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s ease;">自动识别</button>
      </div>`
    );
    const dateInput = dateInputDiv.querySelector('input');
    const autoDateBtn = dateInputDiv.querySelector('button');
    
    dateInput.addEventListener('focus', (e) => e.target.style.cssText += focusInputStyle);
    dateInput.addEventListener('blur', (e) => e.target.style.cssText = inputStyle);
    
    dateInput.addEventListener('wheel', (e) => {
        e.preventDefault();
    });
    
    autoDateBtn.addEventListener('click', async () => {
      try {
        const match = window.location.href.match(/subject\/(\d+)/);
        if (!match) {
          alert('无法从当前URL提取条目ID');
          return;
        }
        
        const subjectId = match[1];
        const subjectUrl = `https://bangumi.tv/subject/${subjectId}`;
        
        autoDateBtn.textContent = '识别中...';
        autoDateBtn.disabled = true;
        
        const response = await fetch(subjectUrl);
        if (!response.ok) {
          throw new Error('无法加载条目页面');
        }
        
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const dateSelectors = [
          'li:has(span.tip:contains("放送开始"))',
          'li:has(span.tip:contains("上映年度"))',
          'li:has(span.tip:contains("发售日"))',
          'li:has(span.tip:contains("开始"))',
          'li:has(span.tip:contains("首播"))'
        ];
        
        let dateText = null;
        for (const selector of dateSelectors) {
          const lis = doc.querySelectorAll('li');
          for (const li of lis) {
            const tip = li.querySelector('span.tip');
            if (tip && (tip.textContent.includes('放送开始') || 
                       tip.textContent.includes('上映年度') || 
                       tip.textContent.includes('发售日') || 
                       tip.textContent.includes('开始') || 
                       tip.textContent.includes('首播'))) {
              dateText = li.textContent.replace(tip.textContent, '').trim();
              break;
            }
          }
          if (dateText) break;
        }
        
        if (!dateText) {
          throw new Error('未找到开播日期');
        }
        
        const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (!dateMatch) {
          throw new Error('日期格式不正确');
        }
        
        const [, year, month, day] = dateMatch;
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateInput.value = formattedDate;
        
        alert('成功识别开播日期！');
      } catch (error) {
        alert('识别开播日期失败: ' + error.message);
      } finally {
        autoDateBtn.textContent = '自动识别';
        autoDateBtn.disabled = false;
      }
    });

    const cycleSelectDiv = createInputGroup(
      '选择更新周期:',
      `<select style="${inputStyle}">
         <option value="" disabled>更新周期</option>
         <option value="周更" selected>周更</option>
         <option value="日更">日更</option>
         <option value="工作日更">工作日更</option>
         <option value="特定星期更">特定星期更</option>
         <option value="月更">月更</option>
         <option value="当天更完">当天更完</option>
       </select>`
    );
    const cycleSelect = cycleSelectDiv.querySelector('select');
    cycleSelect.addEventListener('focus', (e) => e.target.style.cssText += focusInputStyle);
    cycleSelect.addEventListener('blur', (e) => e.target.style.cssText = inputStyle);

    const dailyMultiDiv = createInputGroup(
      '一天几更（默认为1）:',
      `<input type="number" min="1" value="1" style="${inputStyle}"/>`
    );
    dailyMultiDiv.querySelector('input').addEventListener('focus', (e) => e.target.style.cssText += focusInputStyle);
    dailyMultiDiv.querySelector('input').addEventListener('blur', (e) => e.target.style.cssText = inputStyle);


    const initialEpDiv = createInputGroup(
      '首播集数（留空则不启用）:',
      `<input type="number" min="0" placeholder="" style="${inputStyle}"/>`
    );
    initialEpDiv.querySelector('input').addEventListener('focus', (e) => e.target.style.cssText += focusInputStyle);
    initialEpDiv.querySelector('input').addEventListener('blur', (e) => e.target.style.cssText = inputStyle);


    const weekdayDiv = document.createElement('div');
    weekdayDiv.style.cssText = "margin-top:10px; display: none;";
    weekdayDiv.innerHTML = `
      <div>选择星期（至少选2个）：</div>
      <label style="margin-right: 10px; font-size: 14px;"><input type='checkbox' value='1'> 星期一</label>
      <label style="margin-right: 10px; font-size: 14px;"><input type='checkbox' value='2'> 星期二</label>
      <label style="margin-right: 10px; font-size: 14px;"><input type='checkbox' value='3'> 星期三</label>
      <label style="margin-right: 10px; font-size: 14px;"><input type='checkbox' value='4'> 星期四</label>
      <label style="margin-right: 10px; font-size: 14px;"><input type='checkbox' value='5'> 星期五</label>
      <label style="margin-right: 10px; font-size: 14px;"><input type='checkbox' value='6'> 星期六</label>
      <label style="font-size: 14px;"><input type='checkbox' value='7'> 星期日</label>
    `;

    const monthlyDateDiv = document.createElement('div');
    monthlyDateDiv.style.cssText = "margin-top:10px; display: none;";
    monthlyDateDiv.innerHTML = `
      <div>选择每月更新日期：</div>
      <input type="text" placeholder="输入日期(如: 1,15,月底)" style="${inputStyle}; margin-top: 8px;"/>
      <div style="margin-top: 8px; font-size: 12px; color: #999;">提示：输入1-31的数字或"月底"，"月底"代表每月最后一天，多个用逗号分隔(如: 1,15,月底)</div>
    `;

    cycleSelect.addEventListener('change', function () {
      weekdayDiv.style.display = cycleSelect.value === "特定星期更" ? "block" : "none";
      monthlyDateDiv.style.display = cycleSelect.value === "月更" ? "block" : "none";
    });

    const btnDiv = document.createElement('div');
    btnDiv.style.cssText = "text-align:center; margin-top:20px;";
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = "确定";
    const confirmBg = darkMode ? '#f6a1b2' : '#f6a1b2';
    const cancelBg = darkMode ? '#333' : '#d1d1d1';
    const cancelText = darkMode ? '#e0e0e0' : '#333';
    confirmBtn.style.cssText = `
      background-color: ${confirmBg} !important;
      color: white !important;
      border: none;
      padding: 10px 25px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
      margin-right: 15px;
    `;
    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.backgroundColor = darkMode ? '#f491a1' : '#f491a1';
        confirmBtn.style.transform = 'translateY(-1px)';
        confirmBtn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.backgroundColor = darkMode ? '#f6a1b2' : '#f6a1b2';
        confirmBtn.style.transform = 'translateY(0)';
        confirmBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = `
      background-color: ${cancelBg} !important;
      color: ${cancelText} !important;
      border: none;
      padding: 10px 25px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    `;
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = darkMode ? '#444' : '#c1c1c1';
        cancelBtn.style.transform = 'translateY(-1px)';
        cancelBtn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = darkMode ? '#333' : '#d1d1d1';
        cancelBtn.style.transform = 'translateY(0)';
        cancelBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });

    btnDiv.appendChild(confirmBtn);
    btnDiv.appendChild(cancelBtn);

    modal.append(
      title,
      startEpDiv,
      dateInputDiv,
      cycleSelectDiv,
      dailyMultiDiv,
      initialEpDiv,
      weekdayDiv,
      monthlyDateDiv,
      btnDiv
    );
    document.body.appendChild(overlay);

    confirmBtn.addEventListener('click', () => {
      const dVal = dateInput.value;
      const cycleVal = cycleSelect.value;
      let extra = null;
      if (cycleVal === "特定星期更") {
        const checkboxes = weekdayDiv.querySelectorAll("input[type='checkbox']");
        extra = [];
        checkboxes.forEach(chk => {
          if (chk.checked) extra.push(parseInt(chk.value, 10));
        });
        if (extra.length < 2) {
          alert("请至少选择两个星期！");
          return;
        }
      } else if (cycleVal === "月更") {
        const monthlyDateInput = monthlyDateDiv.querySelector("input[type='text']");
        const inputValue = monthlyDateInput.value.trim();
        extra = [];
        
        if (!inputValue) {
          alert("请输入每月更新日期！");
          return;
        }
        
        const dates = inputValue.split(/[,，]/).map(d => d.trim()).filter(d => d);
        for (const date of dates) {
          if (date === "月底" || date === "last") {
            extra.push("last");
          } else {
            const dateNum = parseInt(date, 10);
            if (isNaN(dateNum) || dateNum < 1 || dateNum > 31) {
              alert("请输入有效的日期（1-31或'月底'）！");
              return;
            }
            extra.push(dateNum);
          }
        }
        
        if (extra.length === 0) {
          alert("请输入有效的日期！");
          return;
        }
      }
      const dailyMultiInput = dailyMultiDiv.querySelector("input[type='number']");
      const dailyMulti = parseInt(dailyMultiInput.value, 10);
      if (isNaN(dailyMulti) || dailyMulti < 1) {
        alert("请输入有效的一天几更数字（至少1）");
        return;
      }
      const startEpInput = startEpDiv.querySelector("input[type='number']");
      const startEpVal = startEpInput.value.trim();
      const startEp = startEpVal === "" ? null : parseInt(startEpVal, 10);

      const initialEpInput = initialEpDiv.querySelector("input[type='number']");
      const initialEpVal = initialEpInput.value.trim();
      const initialEpisodes = initialEpVal === "" ? 0 : parseInt(initialEpVal, 10);
      if (isNaN(initialEpisodes) || initialEpisodes < 0) {
          alert("请输入有效的首播集数（非负整数）");
          return;
      }

      onConfirm(dVal, cycleVal, extra, dailyMulti, startEp, initialEpisodes);
      document.body.removeChild(overlay);
    });
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }

  function parseDateUTC(dateStr) {
    const parts = dateStr.split('-');
    return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  }
  function formatDate(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function addDays(date, n) {
    let d = new Date(date);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  }
  function addWeeks(date, n) {
    return addDays(date, 7 * n);
  }
  function addBusinessDays(date, n) {
    let d = new Date(date);
    while (n > 0) {
      d.setUTCDate(d.getUTCDate() + 1);
      const day = d.getUTCDay();
      if (day !== 0 && day !== 6) n--;
    }
    return d;
  }
  function addMonths(date, n) {
    let d = new Date(date);
    const originalDate = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + n);
    if (d.getUTCDate() !== originalDate) {
      d.setUTCDate(0);
    }
    return d;
  }
  
  function computeDate(date, cycle, offset) {
    if (cycle === "日更") return addDays(date, offset);
    if (cycle === "周更") return addWeeks(date, offset);
    if (cycle === "工作日更") return addBusinessDays(date, offset);
    if (cycle === "月更") return addMonths(date, offset);
    if (cycle === "当天更完") return date;
    return addDays(date, offset);
  }

  function getWeekday(d) {
    let wd = d.getUTCDay();
    return wd === 0 ? 7 : wd;
  }

  function getNextScheduledDate(d, selectedDays) {
    let candidate = addDays(d, 1);
    while (!selectedDays.includes(getWeekday(candidate))) {
      candidate = addDays(candidate, 1);
    }
    return candidate;
  }
  function computeSpecificDate(startDate, selectedDays, offset) {
    let d = new Date(startDate);
    let scheduledDate = new Date(d);
    let episodeCount = 0;
    while (episodeCount < offset) {
      scheduledDate = getNextScheduledDate(scheduledDate, selectedDays);
      episodeCount++;
    }
    return scheduledDate;
  }
  
  function getDaysInMonth(year, month) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }
  
  function computeMonthlyDate(startDate, monthlyDay, offset) {
    let d = new Date(startDate);
    if (monthlyDay === "last") {
      d.setUTCMonth(d.getUTCMonth() + offset);
      d.setUTCDate(0);
    } else {
      d.setUTCMonth(d.getUTCMonth() + offset);
      const daysInMonth = getDaysInMonth(d.getUTCFullYear(), d.getUTCMonth());
      d.setUTCDate(Math.min(monthlyDay, daysInMonth));
    }
    return d;
  }
  
  function computeMonthlyDates(startDate, monthlyDays, totalEpisodes) {
    const dates = [];
    let currentDate = new Date(startDate);
    
    dates.push(new Date(currentDate));
    
    let monthOffset = 0;
    let dayIndex = 0;
    
    for (let i = 1; i < totalEpisodes; i++) {
      const day = monthlyDays[dayIndex];
      let d = new Date(startDate);
      
      d.setUTCMonth(d.getUTCMonth() + monthOffset);
      
      if (day === "last") {
        d.setUTCDate(0);
      } else {
        const daysInMonth = getDaysInMonth(d.getUTCFullYear(), d.getUTCMonth());
        d.setUTCDate(Math.min(day, daysInMonth));
      }
      
      if (dayIndex === monthlyDays.length - 1) {
        dayIndex = 0;
        monthOffset++;
      } else {
        const nextDay = monthlyDays[dayIndex + 1];
        let nextDate = new Date(startDate);
        nextDate.setUTCMonth(nextDate.getUTCMonth() + monthOffset);
        if (nextDay === "last") {
          nextDate.setUTCDate(0);
        } else {
          const daysInMonth = getDaysInMonth(nextDate.getUTCFullYear(), nextDate.getUTCMonth());
          nextDate.setUTCDate(Math.min(nextDay, daysInMonth));
        }
        
        if (nextDate <= d) {
          dayIndex = 0;
          monthOffset++;
          d = new Date(startDate);
          d.setUTCMonth(d.getUTCMonth() + monthOffset);
          const currentDay = monthlyDays[0];
          if (currentDay === "last") {
            d.setUTCDate(0);
          } else {
            const daysInMonth = getDaysInMonth(d.getUTCFullYear(), d.getUTCMonth());
            d.setUTCDate(Math.min(currentDay, daysInMonth));
          }
        } else {
          dayIndex++;
        }
      }
      
      dates.push(d);
    }
    
    return dates;
  }

  function processData(startDate, cycle, extra, dailyMulti, startEp, initialEpisodes) {
    let ta = document.querySelector('textarea[name="ep_list"]');
    if (!ta) {
      ta = document.querySelector('textarea[name="eplist"]');
    }
    if (!ta) {
      alert("未找到目标文本域！");
      return;
    }
    
    if (!ta.value.trim()) {
      alert("文本域为空，请先点击'批量生成'按钮生成章节列表！");
      return;
    }
    
    const lines = ta.value.split(/\r?\n/);
    let started = (startEp === null);
    let uniqueCount = 0;
    const mapping = {};
    
    const totalEpisodes = lines.filter(line => line.trim()).length;
    const monthlyDatesCache = cycle === "月更" && Array.isArray(extra) ? computeMonthlyDates(startDate, extra, totalEpisodes) : null;
    
    const res = lines.map(line => {
      if (!line.trim()) return line;
      const parts = line.split("|");
      const chapter = parts[0].trim();
      if (!started) {
        if (chapter === String(startEp)) {
          started = true;
        } else {
          return line;
        }
      }
      let effectiveOffset;
      if (mapping.hasOwnProperty(chapter)) {
        effectiveOffset = mapping[chapter];
      } else {
        if (uniqueCount < initialEpisodes) {
            effectiveOffset = 0;
        } else {
            effectiveOffset = Math.floor((uniqueCount - initialEpisodes) / dailyMulti) + (initialEpisodes > 0 ? 1 : 0);
        }
        mapping[chapter] = effectiveOffset;
        uniqueCount++;
      }
      let newDate;
      if (cycle === "特定星期更" && Array.isArray(extra)) {
        newDate = computeSpecificDate(new Date(startDate), extra, effectiveOffset);
      } else if (cycle === "月更" && Array.isArray(extra) && monthlyDatesCache) {
        newDate = monthlyDatesCache[effectiveOffset] || new Date(startDate);
      } else if (cycle === "月更" && (extra === "last" || typeof extra === "number")) {
        newDate = computeMonthlyDate(new Date(startDate), extra, effectiveOffset);
      } else {
        newDate = computeDate(new Date(startDate), cycle, effectiveOffset);
      }
      parts[4] = formatDate(newDate);
      return parts.join("|");
    });
    ta.value = res.join("\n");
  }

  function injectButton() {
    waitForEl('textarea[name="ep_list"], textarea[name="eplist"]', function (el) {
      const colors = getModeColor();
      const newDiv = document.createElement('div');
      newDiv.style.cssText = 'display: block; margin-bottom: 5px;';
      const link = document.createElement('a');
      link.href = "#";
      link.title = "批量添加章节时间";
      link.style.cssText = `
        display: inline-flex;
        align-items: center;
        text-decoration: none;
        color: ${colors.calendar};
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
      `;
      link.appendChild(createCalendarIcon());
      link.appendChild(document.createTextNode("批量添加时间"));
      newDiv.appendChild(link);

      el.parentNode.insertBefore(newDiv, el);

      link.addEventListener('click', e => {
        e.preventDefault();
        createModal((dateVal, cycleVal, extra, dailyMulti, startEp, initialEpisodes) => {
          if (!dateVal) {
            alert("请选择日期！");
            return;
          }
          const d = parseDateUTC(dateVal);
          if (isNaN(d.getTime())) {
            alert("无效的日期！");
            return;
          }
          if (!cycleVal) {
            alert("请选择更新周期！");
            return;
          }
          processData(d, cycleVal, extra, dailyMulti, startEp, initialEpisodes);
        });
      });
    });
  }

  function injectDateButtonForEditPage() {
    waitForEl('input[name="airdate"]', function (airdateInput) {
      const colors = getModeColor();
      const parentTd = airdateInput.parentNode;
      const dateButton = document.createElement('button');
      dateButton.type = 'button';
      dateButton.style.cssText = `
        margin-left: 10px;
        padding: 2px 8px;
        background-color: #f6a1b2;
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        letter-spacing: 1px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      `;
      
      dateButton.addEventListener('mouseenter', () => {
          dateButton.style.backgroundColor = '#f491a1';
          dateButton.style.transform = 'translateY(-1px)';
          dateButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
      });
      dateButton.addEventListener('mouseleave', () => {
          dateButton.style.backgroundColor = '#f6a1b2';
          dateButton.style.transform = 'translateY(0)';
          dateButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      });
      dateButton.textContent = '选择日期';
      
      const calendarIcon = createCalendarIcon();
      calendarIcon.setAttribute('width', '14');
      calendarIcon.setAttribute('height', '14');
      dateButton.insertBefore(calendarIcon, dateButton.firstChild);
      
      parentTd.appendChild(dateButton);
      
      dateButton.addEventListener('click', () => {
        const colors = getModeColor();
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          z-index: 10000;
          display: flex;
          justify-content: center;
          align-items: center;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
          background: ${colors.background};
          padding: 20px;
          border-radius: 8px;
          min-width: 300px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          color: ${colors.text};
        `;
        
        const title = document.createElement('h4');
        title.textContent = '选择放送日期';
        title.style.cssText = `margin-top: 0; margin-bottom: 15px; color: ${colors.text};`;
        modal.appendChild(title);
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.cssText = `width: 100%; padding: 8px; box-sizing: border-box; margin-bottom: 15px; background: ${isDarkMode() ? '#333' : '#fff'}; color: ${colors.text}; border: 1px solid ${colors.border};`;
        modal.appendChild(dateInput);
        
        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'text-align: center;';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.cssText = `
          background-color: #f6a1b2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          margin-right: 10px;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        `;
        
        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.backgroundColor = '#f491a1';
            confirmBtn.style.transform = 'translateY(-1px)';
            confirmBtn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
        });
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.backgroundColor = '#f6a1b2';
            confirmBtn.style.transform = 'translateY(0)';
            confirmBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
          background-color: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        `;
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.backgroundColor = '#e8e8e8';
            cancelBtn.style.transform = 'translateY(-1px)';
            cancelBtn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.backgroundColor = '#f0f0f0';
            cancelBtn.style.transform = 'translateY(0)';
            cancelBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        });
        
        btnDiv.appendChild(confirmBtn);
        btnDiv.appendChild(cancelBtn);
        modal.appendChild(btnDiv);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        confirmBtn.addEventListener('click', () => {
          if (dateInput.value) {
            airdateInput.value = dateInput.value;
          }
          document.body.removeChild(overlay);
        });
        
        cancelBtn.addEventListener('click', () => {
          document.body.removeChild(overlay);
        });
      });
    });
  }

    function injectButtonForCreatePage() {
    waitForEl('a#number_btn.chiiBtn.rr', function (numberBtn) {
      const colors = getModeColor();
      const newDiv = document.createElement('div');
      newDiv.style.cssText = 'display: inline-block; margin-left: 10px;';
      const link = document.createElement('a');
      link.href = "#";
      link.title = "批量添加章节时间";
      link.style.cssText = `
        display: inline-flex;
        align-items: center;
        text-decoration: none;
        color: ${colors.calendar};
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
      `;
      link.appendChild(createCalendarIcon());
      link.appendChild(document.createTextNode("批量添加时间"));
      newDiv.appendChild(link);

      numberBtn.parentNode.insertBefore(newDiv, numberBtn.nextSibling);

      link.addEventListener('click', e => {
        e.preventDefault();
        createModal((dateVal, cycleVal, extra, dailyMulti, startEp, initialEpisodes) => {
          if (!dateVal) {
            alert("请选择日期！");
            return;
          }
          const d = parseDateUTC(dateVal);
          if (isNaN(d.getTime())) {
            alert("无效的日期！");
            return;
          }
          if (!cycleVal) {
            alert("请选择更新周期！");
            return;
          }
          processData(d, cycleVal, extra, dailyMulti, startEp, initialEpisodes);
        });
      });
    });

    waitForEl('input[name="airdate"]', function (airdateInput) {
      const colors = getModeColor();
      const parentTd = airdateInput.parentNode;
      const dateButton = document.createElement('button');
      dateButton.type = 'button';
      dateButton.style.cssText = `
        margin-left: 10px;
        padding: 2px 8px;
        background-color: #f6a1b2;
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        letter-spacing: 1px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      `;
      
      dateButton.addEventListener('mouseenter', () => {
          dateButton.style.backgroundColor = '#f491a1';
          dateButton.style.transform = 'translateY(-1px)';
          dateButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
      });
      dateButton.addEventListener('mouseleave', () => {
          dateButton.style.backgroundColor = '#f6a1b2';
          dateButton.style.transform = 'translateY(0)';
          dateButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      });
      dateButton.textContent = '选择日期';
      
      const calendarIcon = createCalendarIcon();
      calendarIcon.setAttribute('width', '14');
      calendarIcon.setAttribute('height', '14');
      dateButton.insertBefore(calendarIcon, dateButton.firstChild);
      
      parentTd.appendChild(dateButton);
      
      dateButton.addEventListener('click', () => {
        const colors = getModeColor();
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          z-index: 10000;
          display: flex;
          justify-content: center;
          align-items: center;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
          background: ${colors.background};
          padding: 20px;
          border-radius: 8px;
          min-width: 300px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          color: ${colors.text};
        `;
        
        const title = document.createElement('h4');
        title.textContent = '选择放送日期';
        title.style.cssText = `margin-top: 0; margin-bottom: 15px; color: ${colors.text};`;
        modal.appendChild(title);
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.cssText = `width: 100%; padding: 8px; box-sizing: border-box; margin-bottom: 15px; background: ${isDarkMode() ? '#333' : '#fff'}; color: ${colors.text}; border: 1px solid ${colors.border};`;
        modal.appendChild(dateInput);
        
        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'text-align: center;';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.cssText = `
          background-color: ${colors.secondary};
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 10px;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
          background-color: ${isDarkMode() ? '#444' : '#d1d1d1'};
          color: ${colors.text};
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        `;
        
        btnDiv.appendChild(confirmBtn);
        btnDiv.appendChild(cancelBtn);
        modal.appendChild(btnDiv);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        confirmBtn.addEventListener('click', () => {
          if (dateInput.value) {
            airdateInput.value = dateInput.value;
          }
          document.body.removeChild(overlay);
        });
        
        cancelBtn.addEventListener('click', () => {
          document.body.removeChild(overlay);
        });
      });
    });
  }

  function isCreatePage() {
    return /\/ep\/create/.test(window.location.href);
  }

  function isEditPage() {
    return /\/ep\/\d+\/edit/.test(window.location.href);
  }

  if (isCreatePage()) {
    injectButtonForCreatePage();
  } else if (isEditPage()) {
    injectDateButtonForEditPage();
  } else {
    injectButton();
  }
})();
