// ==UserScript==
// @name         WIKI通过条目快速关联角色
// @version      1.4.1
// @description  通过条目快速关联角色
// @author       Sumora、chitanda
// @match        http*://bgm.tv/subject/*/add_related/character
// @match        http*://bangumi.tv/subject/*/add_related/character
// @match        http*://chii.in/subject/*/add_related/character
// @match        http*://bgm.tv/subject/*
// @match        http*://bangumi.tv/subject/*
// @match        http*://chii.in/subject/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==
$(document).ready(function() {
    var chitanda_association_queue = [];
    var chitanda_is_associating = false;
    var currentUrl = window.location.href;
    var isAddRelatedPage = currentUrl.match(/subject\/\d+\/add_related\/character/);
    var isSubjectPage = !isAddRelatedPage && currentUrl.match(/subject\/\d+$/);
    
    function isDarkMode() {
        const dataTheme = document.documentElement.getAttribute('data-theme');
        return dataTheme === 'dark' || 
               document.documentElement.classList.contains('night') || 
               document.body.classList.contains('dark') ||
               window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    function getThemeColors() {
        if (isDarkMode()) {
            return {
                bg: '#1f1f1f',
                border: '#333',
                text: '#e0e0e0',
                subText: '#a0a0a0',
                inputBg: '#2a2a2a',
                hoverBg: '#2a2a2a',
                primary: '#ff729f'
            };
        }
        return {
            bg: '#f9f9f9',
            border: '#ddd',
            text: '#333',
            subText: '#666',
            inputBg: '#eaf1f1',
            hoverBg: '#f0f0f0',
            primary: '#d346bb'
        };
    }
    
    function setupThemeObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    console.log('主题变化:', mutation.target.getAttribute('data-theme'));
                    updateThemeColors();
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
        
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                console.log('系统主题变化:', e.matches ? 'dark' : 'light');
                updateThemeColors();
            });
        }
        
        const classObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (mutation.target.classList.contains('dark') || mutation.target.classList.contains('night')) {
                        console.log('主题class变化:', mutation.target.className);
                        updateThemeColors();
                    }
                }
            });
        });
        
        classObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        classObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    function updateThemeColors() {
        const colors = getThemeColors();
        console.log('更新主题颜色:', colors);
        
        const scriptElements = document.querySelectorAll(
            `#chitanda_character_selection, #chitanda_search_results, #chitanda_related_subjects, 
             #chitanda_search_results_modal, #chitanda_related_subjects_modal, #chitanda_wiki_panel, 
             .chitanda_character_wrapper, .chitanda_progress, 
             [id^="chitanda_"], [class^="chitanda_"]`
        );
        
        scriptElements.forEach((el) => {
            if (el.id === 'chitanda_character_selection' || 
                el.id === 'chitanda_search_results' || 
                el.id === 'chitanda_related_subjects' || 
                el.id === 'chitanda_search_results_modal' || 
                el.id === 'chitanda_related_subjects_modal' || 
                el.id === 'chitanda_wiki_panel' || 
                el.classList.contains('chitanda_character_wrapper')) {
                el.style.border = `1px solid ${colors.border}`;
                el.style.background = colors.bg;
            }
            
            if (el.classList.contains('chitanda_progress')) {
                el.style.color = colors.primary;
            }
            
            const childElements = el.querySelectorAll('span, p, small, div, a, h2, h3, h4, label, li');
            childElements.forEach((childEl) => {
                if (childEl.closest('[id^="chitanda_"]') || childEl.closest('[class^="chitanda_"]')) {
                    if (childEl.style.color) {
                        childEl.style.color = colors.text;
                    } else if (childEl.tagName === 'A') {
                        childEl.style.color = colors.primary;
                    } else if (childEl.classList.contains('tip') || childEl.classList.contains('sub_title')) {
                        childEl.style.color = colors.subText;
                    }
                    
                    if (childEl.style.background) {
                        childEl.style.background = colors.inputBg;
                    }
                    if (childEl.style.backgroundColor) {
                        childEl.style.backgroundColor = colors.inputBg;
                    }
                    
                    if (childEl.style.border || childEl.style.borderBottom || childEl.style.borderTop) {
                        childEl.style.border = `1px solid ${colors.border}`;
                        childEl.style.borderBottom = `1px solid ${colors.border}`;
                        childEl.style.borderTop = `1px solid ${colors.border}`;
                    }
                }
            });
        });
        
        const hoverElements = document.querySelectorAll(
            `#chitanda_character_selection li.clearit, #chitanda_search_results li, 
             #chitanda_related_subjects li.chitanda_related_item, #chitanda_search_results_modal li, 
             #chitanda_related_subjects_modal li.chitanda_related_item_modal`
        );
        
        hoverElements.forEach((el) => {
            el.addEventListener('mouseover', function() {
                this.style.background = colors.hoverBg;
            });
            el.addEventListener('mouseout', function() {
                this.style.background = 'transparent';
            });
        });
    }
    
    if (typeof GM_registerMenuCommand === 'undefined') {
        window.GM_registerMenuCommand = function() {};
    }
    
    if (typeof genPrsnStaffList === 'undefined') {
        window.genPrsnStaffList = function() {};
    }
    
    var ctd_findCharacterFunc = function(character_list, idx, callback) {
        try {
            if (!character_list || !Array.isArray(character_list) || character_list.length === 0) {
                if (callback) callback();
                return;
            }
            
            if (idx >= character_list.length) {
                if (callback) callback();
                return;
            }
            
            let character_info = character_list[idx];
            let character_id = typeof character_info === 'object' ? character_info.id : character_info;
            var character_num = character_list.length;

            if ($('.chitanda_current_idx').length > 0) {
                var currentProgress = (chitanda_association_queue.length + 1) - (character_list.length - idx - 1);
                $('.chitanda_current_idx').text(currentProgress);
            }
            if ($('.chitanda_all_num').length > 0) {
                var totalCharacters = chitanda_association_queue.length + 1;
                $('.chitanda_all_num').text(totalCharacters);
            }
            
            if (isAddRelatedPage) {
                var crtRelateSubjects = document.getElementById('crtRelateSubjects');
                
                if (crtRelateSubjects) {
                    var existingCrtIds = new Set();
                    crtRelateSubjects.querySelectorAll('input[type="hidden"][name*="crt_id"]').forEach(function(input) {
                        existingCrtIds.add(input.value);
                    });
                    
                    if (existingCrtIds.has(String(character_id))) {
                        if ($('.chitanda_character_added').length > 0) {
                            var colors = getThemeColors();
                            var addedContainer = $('.chitanda_character_added');
                            addedContainer.append(`<span style="color: #999;">[${character_id}] ${character_info.name || ''} (已存在，跳过) </span>`);
                            addedContainer.scrollTop(addedContainer[0].scrollHeight);
                        }
                        
                        setTimeout(function() {
                            if (idx < character_num - 1) {
                                setTimeout(function() {
                                    idx++;
                                    ctd_findCharacterFunc(character_list, idx, callback);
                                }, 100);
                            } else if (callback) {
                                callback();
                            }
                        }, 100);
                        return;
                    }
                    
                    var colors = getThemeColors();
                    var index = crtRelateSubjects.querySelectorAll('li').length;
                    
                    var newLi = document.createElement('li');
                    newLi.className = 'clearit has-handle';
                    var characterIndex = 'n' + index;
                    newLi.innerHTML = `
                        <span class="drag-handle"></span>
                        <p><a href="javascript:void(0);" class="h rr">x</a></p>
                        <p class="title">
                            <a href="/character/${character_id}" class="l" target="_blank">${character_info.name || ''}</a>
                        </p>
                        <span class="tip">
                            <input type="hidden" name="infoArr[${characterIndex}][crt_id]" value="${character_id}">
                            类型: <select name="infoArr[${characterIndex}][crt_type]" data-adjusted="true">
                                <option value="1" selected="">主角</option>
                                <option value="2">配角</option>
                                <option value="3">客串</option>
                                <option value="4">闲角</option>
                                <option value="5">旁白</option>
                                <option value="6">声库</option>
                            </select>
                            <span class="tip_j"> 参与：</span>
                            <input type="text" name="infoArr[${characterIndex}][crt_appear_eps]" class="inputtext medium" value="">
                            <label><span class="tip_j"> 剧透：</span><input type="checkbox" name="infoArr[${characterIndex}][crt_spoiler]" value="1" undefined=""></label>
                            <span class="tip_j"> 排序：</span>
                            <input type="text" name="infoArr[${characterIndex}][crt_order]" value="0" class="inputtext item_sort" onfocus="this.select()" onmouseover="this.focus()" autocomplete="off">
                        </span>
                    `;
                    
                    crtRelateSubjects.insertBefore(newLi, crtRelateSubjects.firstChild);
                    
                    if ($('.chitanda_character_added').length > 0) {
                        var addedContainer = $('.chitanda_character_added');
                        addedContainer.append(`<span style="color: ${colors.primary};">[${character_id}] ${character_info.name || ''} </span>`);
                        addedContainer.scrollTop(addedContainer[0].scrollHeight);
                    }
                    
                    setTimeout(function() {
                        if (idx < character_num - 1) {
                            setTimeout(function() {
                                idx++;
                                ctd_findCharacterFunc(character_list, idx, callback);
                            }, 500);
                        } else {
                            setTimeout(function() {
                                if (callback) {
                                    callback();
                                }
                            }, 500);
                        }
                    }, 300);
                } else {
                    if (idx < character_num - 1) {
                        setTimeout(function() {
                            idx++;
                            ctd_findCharacterFunc(character_list, idx, callback);
                        }, 1000);
                    } else if (callback) {
                        callback();
                    }
                }
            } else if (isSubjectPage) {
                const colors = getThemeColors();
                const bgmBatchModal = document.getElementById('bgm-batch-modal');
                if (bgmBatchModal) {
                    const newCrtIdInput = document.getElementById('new-crt-id');
                    const bgmBtnAddRow = document.getElementById('bgm-btn-add-row');
                    
                    if (newCrtIdInput && bgmBtnAddRow) {
                        const existingRow = document.querySelector(`tr[data-crt-id="${character_id}"]`);
                        
                        if (existingRow) {
                            var addedModal = document.querySelector('.chitanda_character_added_modal');
                            var hasNewCv = false;
                            
                            if (character_info.cvIds && character_info.cvIds.length > 0) {
                                character_info.cvIds.forEach(function(cvId, cvIndex) {
                                    const existingCvInputs = existingRow.querySelectorAll('.cv-id');
                                    let cvExists = false;
                                    
                                    existingCvInputs.forEach(function(input) {
                                        if (input.value === cvId) {
                                            cvExists = true;
                                        }
                                    });
                                    
                                    if (!cvExists) {
                                        hasNewCv = true;
                                        const addCvBtn = existingRow.querySelector('.add-cv-btn');
                                        if (addCvBtn) {
                                            addCvBtn.click();
                                            
                                            var cvName = character_info.cvNames && character_info.cvNames[cvIndex] ? character_info.cvNames[cvIndex] : cvId;
                                            if (addedModal) {
                                                addedModal.innerHTML += `<span style="color: ${colors.primary};">[${character_id}] ${character_info.name || ''} CV: ${cvName} (已存在，CV关联成功) </span>`;
                                                addedModal.scrollTop = addedModal.scrollHeight;
                                            }
                                            
                                            setTimeout(function() {
                                                const newCvInputs = existingRow.querySelectorAll('.cv-id');
                                                const lastInput = newCvInputs[newCvInputs.length - 1];
                                                if (lastInput) {
                                                    lastInput.value = cvId;
                                                }
                                            }, 500);
                                        }
                                    }
                                });
                                
                                if (!hasNewCv && addedModal) {
                                    addedModal.innerHTML += `<span style="color: #999;">[${character_id}] ${character_info.name || ''} (已存在，跳过) </span>`;
                                    addedModal.scrollTop = addedModal.scrollHeight;
                                }
                            } else {
                                const existingCvInputs = existingRow.querySelectorAll('.cv-id');
                                let hasCv = false;
                                
                                existingCvInputs.forEach(function(input) {
                                    if (input.value) {
                                        hasCv = true;
                                    }
                                });
                                
                                if (!hasCv) {
                                    const addCvBtn = existingRow.querySelector('.add-cv-btn');
                                    if (addCvBtn) {
                                        addCvBtn.click();
                                        if (addedModal) {
                                            addedModal.innerHTML += `<span style="color: ${colors.primary};">[${character_id}] ${character_info.name || ''} (已存在，添加成功) </span>`;
                                            addedModal.scrollTop = addedModal.scrollHeight;
                                        }
                                    }
                                } else if (addedModal) {
                                    addedModal.innerHTML += `<span style="color: #999;">[${character_id}] ${character_info.name || ''} (已存在，跳过) </span>`;
                                    addedModal.scrollTop = addedModal.scrollHeight;
                                }
                            }
                        } else {
                            if (character_info.cvIds && character_info.cvIds.length > 0) {
                                newCrtIdInput.value = character_id;
                                
                                const newCvIdInput = document.getElementById('new-cv-id');
                                if (newCvIdInput) {
                                    newCvIdInput.value = character_info.cvIds[0];
                                }
                                
                                bgmBtnAddRow.click();
                                
                                var addedModal = document.querySelector('.chitanda_character_added_modal');
                                if (addedModal) {
                                    var cvName = character_info.cvNames && character_info.cvNames[0] ? character_info.cvNames[0] : character_info.cvIds[0];
                                    addedModal.innerHTML += `<span style="color: ${colors.primary};">[${character_id}] ${character_info.name || ''} CV: ${cvName} (添加成功) </span>`;
                                    addedModal.scrollTop = addedModal.scrollHeight;
                                }
                                
                                setTimeout(function() {
                                    const newRow = document.querySelector(`tr[data-crt-id="${character_id}"]`);
                                    if (newRow) {
                                        for (let i = 1; i < character_info.cvIds.length; i++) {
                                            const cvId = character_info.cvIds[i];
                                            
                                            const addCvBtn = newRow.querySelector('.add-cv-btn');
                                            if (addCvBtn) {
                                                addCvBtn.click();
                                                
                                                setTimeout(function() {
                                                    const cvInputs = newRow.querySelectorAll('.cv-id');
                                                    const lastInput = cvInputs[cvInputs.length - 1];
                                                    if (lastInput) {
                                                        lastInput.value = cvId;
                                                        var addedModal = document.querySelector('.chitanda_character_added_modal');
                                                        if (addedModal) {
                                                            var cvName = character_info.cvNames && character_info.cvNames[i] ? character_info.cvNames[i] : cvId;
                                                            addedModal.innerHTML += `<span style="color: ${colors.primary};">[${character_id}] ${character_info.name || ''} CV: ${cvName} (CV关联成功) </span>`;
                                                            addedModal.scrollTop = addedModal.scrollHeight;
                                                        }
                                                    }
                                                }, 500);
                                            }
                                        }
                                    }
                                }, 1000);
                            } else {
                                newCrtIdInput.value = character_id;
                                
                                const newCvIdInput = document.getElementById('new-cv-id');
                                if (newCvIdInput) {
                                    newCvIdInput.value = '';
                                }
                                
                                bgmBtnAddRow.click();
                                
                                var addedModal = document.querySelector('.chitanda_character_added_modal');
                                if (addedModal) {
                                    addedModal.innerHTML += `<span style="color: ${colors.primary};">[${character_id}] ${character_info.name || ''} (添加成功) </span>`;
                                    addedModal.scrollTop = addedModal.scrollHeight;
                                }
                            }
                        }
                        
                        setTimeout(function() {
                            if (idx < character_num - 1) {
                                setTimeout(function() {
                                    idx++;
                                    ctd_findCharacterFunc(character_list, idx);
                                }, 2000);
                            } else if (callback) {
                                callback();
                            }
                        }, 2000);
                    } else if (idx < character_num - 1) {
                        setTimeout(function() {
                            idx++;
                            ctd_findCharacterFunc(character_list, idx, callback);
                        }, 1000);
                    } else if (callback) {
                        callback();
                    }
                } else if (idx < character_num - 1) {
                    setTimeout(function() {
                        idx++;
                        ctd_findCharacterFunc(character_list, idx, callback);
                    }, 1000);
                } else if (callback) {
                    callback();
                }
            } else if (idx < character_num - 1) {
                setTimeout(function() {
                    idx++;
                    ctd_findCharacterFunc(character_list, idx, callback);
                }, 1000);
            } else if (callback) {
                callback();
            }
        } catch (error) {
            var character_num = character_list ? character_list.length : 0;
            if (idx < character_num - 1) {
                setTimeout(function() {
                    idx++;
                    ctd_findCharacterFunc(character_list, idx, callback);
                }, 1000);
            } else if (callback) {
                callback();
            }
        }
    };

    var chitanda_MultiFindCharacterFunc = function() {
        var ctd_character_list = $('#subjectName').val().split(/['\,，\/、']/);
        ctd_findCharacterFunc(ctd_character_list, 0);
    };
    
    var chitanda_FetchFromRelatedSubjectWithId = function(subject_id, subject_name) {
        try {
            if (!subject_id) {
                alert('请输入有效的关联条目ID');
                return;
            }
            
            if ($('#chitanda_fetch_status').length > 0) {
                $('#chitanda_fetch_status').text('正在获取角色列表...');
            }
            
            fetch('/subject/' + subject_id, {
                credentials: 'include',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            })
            .then(response => response.text())
            .then(subjectHtml => {
                var $subjectHtml = $(subjectHtml);
                var coverImage = $subjectHtml.find('.infobox .cover img').attr('src') || 
                                $subjectHtml.find('.bangumi-info .cover img').attr('src');
                
                if (!coverImage) {
                    var $coverNeue = $subjectHtml.find('.coverNeue.avatarSize75');
                    if ($coverNeue.length > 0) {
                        var bgImage = $coverNeue.css('background-image');
                        if (bgImage) {
                            var urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                            if (urlMatch) {
                                coverImage = urlMatch[1];
                            }
                        }
                    }
                }
                
                if (!coverImage) {
                    coverImage = '//lain.bgm.tv/img/no_icon_subject.png';
                }
                
                if (coverImage && !coverImage.startsWith('http')) {
                    if (!coverImage.startsWith('/')) {
                        coverImage = 'https:' + coverImage;
                    }
                }
                
                return fetch('/subject/' + subject_id + '/characters', {
                    credentials: 'include',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                })
                .then(response => response.text())
                .then(html => {

                    try {
                        var character_info = [];
                        var $html = $(html);
                        $html.find('.item.light_odd, .item.light_even').each(function() {
                            var $item = $(this);
                            var $nameLink = $item.find('h2.subtitle a.l');
                            var name = $nameLink.text().trim();
                            
                            var id = '';
                            var $nameAnchor = $item.prev('a[name^="id_"]');
                            if ($nameAnchor.length > 0) {
                                var nameAttr = $nameAnchor.attr('name');
                                var idMatch = nameAttr.match(/id_(\d+)/);
                                if (idMatch) {
                                    id = idMatch[1];
                                }
                            } else {
                                var href = $nameLink.attr('href');
                                var idMatch = href ? href.match(/\/character\/(\d+)/) : null;
                                if (idMatch) {
                                    id = idMatch[1];
                                } else {
                                    var $avatarLink = $item.find('a.avatar');
                                    var avatarHref = $avatarLink.attr('href');
                                    var avatarIdMatch = avatarHref ? avatarHref.match(/\/character\/(\d+)/) : null;
                                    if (avatarIdMatch) {
                                        id = avatarIdMatch[1];
                                    }
                                }
                            }
                            
                            var cvIds = [];
                            var cvNames = [];
                            var $actorBadges = $item.find('.actorBadge.badge_actor');
                            $actorBadges.each(function() {
                                var $cvLink = $(this).find('a.avatar');
                                if ($cvLink.length > 0) {
                                    var cvHref = $cvLink.attr('href');
                                    var cvIdMatch = cvHref ? cvHref.match(/\/person\/(\d+)/) : null;
                                    if (cvIdMatch) {
                                        cvIds.push(cvIdMatch[1]);
                                    }
                                }
                                var $cvNameLink = $(this).find('a.l');
                                if ($cvNameLink.length > 0) {
                                    cvNames.push($cvNameLink.text().trim());
                                }
                            });
                            
                            var $avatar = $item.find('a.avatar img').filter(function() {
                                return !$(this).closest('.actorBadge').length;
                            }).first();
                            var image = $avatar.attr('src') || '';
                            
                            if (name && id) {
                                character_info.push({name: name, image: image, id: id, cvIds: cvIds, cvNames: cvNames});
                            }
                        })
                        
                        if (character_info.length === 0) {

                            $html.find('h2.l').each(function() {
                                var $link = $(this).find('a');
                                var name = $link.text().trim();
                                var href = $link.attr('href');
                                var id = href ? href.match(/\/character\/(\d+)/) : null;
                                id = id ? id[1] : '';
                                var cvIds = [];
                                var cvNames = [];
                                var $actorBadges = $(this).closest('.item').find('.actorBadge.badge_actor');
                                $actorBadges.each(function() {
                                    var $cvLink = $(this).find('a.avatar');
                                    if ($cvLink.length > 0) {
                                        var cvHref = $cvLink.attr('href');
                                        var cvIdMatch = cvHref ? cvHref.match(/\/person\/(\d+)/) : null;
                                        if (cvIdMatch) {
                                            cvIds.push(cvIdMatch[1]);
                                        }
                                    }
                                    var $cvNameLink = $(this).find('a.l');
                                    if ($cvNameLink.length > 0) {
                                        cvNames.push($cvNameLink.text().trim());
                                    }
                                });
                                if (name && id) {
                                    character_info.push({name: name, image: '', id: id, cvIds: cvIds, cvNames: cvNames});
                                }
                            });
                        }
                        
                        
                        if (character_info.length > 0) {
                            $('#chitanda_fetch_status').text(`找到 ${character_info.length} 个角色`);
                        } else {
                            $('#chitanda_fetch_status').text('未找到角色');
                        }

                        showCharacterSelection(character_info, subject_id, subject_name, coverImage);
                    } catch (error) {
                        $('#chitanda_fetch_status').text('处理角色列表时出错');
                    }
                });
            })
            .catch(error => {
                $('#chitanda_fetch_status').text('获取失败，请检查网络连接或条目ID');
            });
        } catch (error) {
            $('#chitanda_fetch_status').text('获取角色列表时出错');
        }
    };
    

    function showCharacterSelection(characters, subjectId, subjectName, coverImage) {
        if (coverImage && !coverImage.startsWith('http')) {
            if (!coverImage.startsWith('/')) {
                coverImage = 'https:' + coverImage;
            }
        }
        
        var colors = getThemeColors();
        
        var selectionHtml = `
            <div id="chitanda_character_selection" style="margin: 2px 0 10px 0; padding: 10px; border: 1px solid ${colors.border}; background: ${colors.bg}; max-height: 400px; overflow-y: auto; width: 318.34px;">
                <ul id="chitanda_subjectList" class="subjectList ajaxSubjectList" style="display: block; margin: 0; padding: 0; list-style: none;">
                    <li class="clearit" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid ${colors.border};">
                        <a href="/subject/${subjectId}" class="avatar h" style="display: block; float: left; margin-right: 10px;">
                            <img src="${coverImage || '//lain.bgm.tv/img/no_icon_subject.png'}" class="avatar ll" width="40" style="border-radius: 4px;">
                        </a>
                        <div class="inner" style="overflow: hidden;">
                            <p style="margin: 0; font-size: 14px;">
                                <a href="/subject/${subjectId}" class="avatar h" style="font-weight: bold; color: ${colors.text};">${subjectName}</a>
                            </p>
                            <small class="tip" style="color: ${colors.subText}; font-size: 12px;">${subjectName}</small>
                        </div>
                    </li>
                    <li class="sub_title" style="font-weight: bold; margin: 10px 0; padding: 5px 0; border-top: 1px solid ${colors.border}; border-bottom: 1px solid ${colors.border}; font-size: 14px; color: ${colors.text};">选择作品的角色</li>
                    <li class="clearit" style="margin: 5px 0; padding: 5px; border-bottom: 1px solid ${colors.border};">
                        <input type="text" id="chitanda_character_search" placeholder="搜索角色..." style="width: 100%; padding: 4px; border: 1px solid ${colors.border}; border-radius: 4px; background: ${colors.inputBg}; color: ${colors.text}; font-size: 12px; box-sizing: border-box;" oninput="chitanda_filter_characters(this.value)">
                    </li>
        `;
        
        if (characters && characters.length > 0) {
            let existIds = [];
            $('#crtRelateSubjects input[name*="crt_id"]').each(function(){
              existIds.push(String($(this).val()));
            });
            
            characters.forEach(function(character, index) {
                var isDuplicate = existIds.includes(String(character.id));
                
                var image = character.image || '/img/info_only.png';
                if (image && !image.startsWith('http') && !image.startsWith('/')) {
                    image = 'https:' + image;
                }
                
                var cvSelectionHtml = '';
                if (isSubjectPage && character.cvIds && character.cvIds.length > 0) {
                    cvSelectionHtml = '<div style="margin-top: 4px;">';
                    cvSelectionHtml += `
                        <label style="display: inline-block; margin-right: 8px; font-size: 11px; color: ${colors.subText}; cursor: pointer;">
                            <input type="checkbox" name="chitanda_cv_${index}_none" value="" checked style="margin-right: 2px;">
                            不关联CV
                        </label>
                    `;
                    character.cvIds.forEach(function(cvId, i) {
                        var cvName = character.cvNames[i] || '未知';
                        cvSelectionHtml += `
                            <label style="display: inline-block; margin-right: 8px; font-size: 11px; color: ${colors.subText}; cursor: pointer;">
                                <input type="checkbox" name="chitanda_cv_${index}_${i}" value="${cvId}" style="margin-right: 2px;">
                                ${cvName} (${cvId})
                            </label>
                        `;
                    });
                    cvSelectionHtml += '</div>';
                } else if (character.cvIds && character.cvIds.length > 0) {
                    var cvList = character.cvIds.map(function(cvId, i) {
                        var cvName = character.cvNames[i] || '未知';
                        return `${cvName} (${cvId})`;
                    }).join(', ');
                    cvSelectionHtml = `<p style="margin: 2px 0 0 0; font-size: 11px; color: ${colors.subText}; line-height: 1.3;"><span style="margin-left: 8px;">CV: ${cvList}</span></p>`;
                }
                
                selectionHtml += `
                    <li class="clearit" style="margin: 3px 0; padding: 5px; border-bottom: 1px solid ${colors.border}; display: flex; align-items: center; cursor: pointer; ${isDuplicate ? 'display: none;' : ''}" data-char-id="${character.id}" data-cv-ids="${character.cvIds ? character.cvIds.join(',') : ''}" data-cv-names="${character.cvNames ? character.cvNames.join('|') : ''}" data-index="${index}" data-is-duplicate="${isDuplicate}">
                        <a href="#" class="avatar" style="display: block; margin-right: 8px; flex-shrink: 0;">
                            <img src="${image}" class="avatar ll" width="36" height="36" style="border-radius: 4px;">
                        </a>
                        <div class="inner" style="flex: 1; min-width: 0;">
                            <p style="margin: 0; font-size: 13px; line-height: 1.4;">
                                <span style="font-weight: 500; color: ${colors.text};">${character.name}${isDuplicate ? ' <span style="color: #999; font-size: 11px;">(已存在)</span>' : ''}</span>
                            </p>
                            <p style="margin: 2px 0 0 0; font-size: 11px; color: ${colors.subText}; line-height: 1.3;">
                                <span>bgm_id=${character.id}</span>
                            </p>
                            ${cvSelectionHtml}
                        </div>
                    </li>
                `;
            });
        } else {
            selectionHtml += `
                <li class="clearit" style="margin: 10px 0; padding: 10px; text-align: center; color: ${colors.subText};">
                    此条目未关联角色
                </li>
            `;
        }
        
        selectionHtml += `
                </ul>
            </div>
        `;
        
        $('#chitanda_character_selection, #chitanda_character_selection_modal').remove();
        
        var targetContainer, targetListId, targetSearchId;
        
        if (isSubjectPage) {
            const relatedSubjectsModal = document.getElementById('ctd_wiki_related_subjects_modal');
            if (relatedSubjectsModal) {
                let modalHtml = `
                    <div id="chitanda_character_selection_modal" style="margin: 5px 0; padding: 5px; border: 1px solid ${colors.border}; background: ${colors.bg}; max-height: 200px; overflow-y: auto; width: 100%; box-sizing: border-box;">
                        <ul id="chitanda_subjectList_modal" class="subjectList ajaxSubjectList" style="display: block; margin: 0; padding: 0; list-style: none;">
                            <li class="clearit" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid ${colors.border};">
                                <a href="/subject/${subjectId}" class="avatar h" style="display: block; float: left; margin-right: 10px;">
                                    <img src="${coverImage || '//lain.bgm.tv/img/no_icon_subject.png'}" class="avatar ll" width="40" style="border-radius: 4px;">
                                </a>
                                <div class="inner" style="overflow: hidden;">
                                    <p style="margin: 0; font-size: 14px;">
                                        <a href="/subject/${subjectId}" class="avatar h" style="font-weight: bold; color: ${colors.text};">${subjectName}</a>
                                    </p>
                                    <small class="tip" style="color: ${colors.subText}; font-size: 12px;">${subjectName}</small>
                                </div>
                            </li>
                            <li class="sub_title" style="font-weight: bold; margin: 10px 0; padding: 5px 0; border-top: 1px solid ${colors.border}; border-bottom: 1px solid ${colors.border}; font-size: 14px; color: ${colors.text};">选择作品的角色</li>
                            <li class="clearit" style="margin: 5px 0; padding: 5px; border-bottom: 1px solid ${colors.border};">
                                <input type="text" id="chitanda_character_search_modal" placeholder="搜索角色..." style="width: 100%; padding: 4px; border: 1px solid ${colors.border}; border-radius: 4px; background: ${colors.inputBg}; color: ${colors.text}; font-size: 12px; box-sizing: border-box;" oninput="chitanda_filter_characters_modal(this.value)">
                            </li>
                `;
                
                if (characters && characters.length > 0) {
                    let existIds = [];
                    $('#crtRelateSubjects input[name*="crt_id"], #bgm-relation-table tr[data-crt-id]').each(function(){
                      existIds.push(String($(this).val() || $(this).data('crt-id')));
                    });
                    
                    characters.forEach(function(character, index) {
                        var isDuplicate = existIds.includes(String(character.id));
                        var image = character.image || '/img/info_only.png';
                        if (image && !image.startsWith('http') && !image.startsWith('/')) {
                            image = 'https:' + image;
                        }
                        
                        var cvSelectionHtml = '';
                        if (isSubjectPage && character.cvIds && character.cvIds.length > 0) {
                            cvSelectionHtml = '<div style="margin-top: 4px;">';
                            cvSelectionHtml += `
                                <label style="display: inline-block; margin-right: 8px; font-size: 11px; color: ${colors.subText}; cursor: pointer;">
                                    <input type="checkbox" name="chitanda_cv_modal_${index}_none" value="" checked style="margin-right: 2px;">
                                    不关联CV
                                </label>
                            `;
                            character.cvIds.forEach(function(cvId, i) {
                                var cvName = character.cvNames[i] || '未知';
                                cvSelectionHtml += `
                                    <label style="display: inline-block; margin-right: 8px; font-size: 11px; color: ${colors.subText}; cursor: pointer;">
                                        <input type="checkbox" name="chitanda_cv_modal_${index}_${i}" value="${cvId}" style="margin-right: 2px;">
                                        ${cvName} (${cvId})
                                    </label>
                                `;
                            });
                            cvSelectionHtml += '</div>';
                        } else if (character.cvIds && character.cvIds.length > 0) {
                            var cvList = character.cvIds.map(function(cvId, i) {
                                var cvName = character.cvNames[i] || '未知';
                                return `${cvName} (${cvId})`;
                            }).join(', ');
                            cvSelectionHtml = `<p style="margin: 2px 0 0 0; font-size: 11px; color: ${colors.subText}; line-height: 1.3;"><span style="margin-left: 8px;">CV: ${cvList}</span></p>`;
                        }
                        
                        modalHtml += `
                            <li class="clearit" style="margin: 3px 0; padding: 5px; border-bottom: 1px solid ${colors.border}; display: flex; align-items: center; cursor: pointer; ${isDuplicate ? 'display: none;' : ''}" data-char-id="${character.id}" data-cv-ids="${character.cvIds ? character.cvIds.join(',') : ''}" data-cv-names="${character.cvNames ? character.cvNames.join('|') : ''}" data-index="${index}" data-is-duplicate="${isDuplicate}">
                                <a href="#" class="avatar" style="display: block; margin-right: 8px; flex-shrink: 0;">
                                    <img src="${image}" class="avatar ll" width="36" height="36" style="border-radius: 4px;">
                                </a>
                                <div class="inner" style="flex: 1; min-width: 0;">
                                    <p style="margin: 0; font-size: 13px; line-height: 1.4;">
                                        <span style="font-weight: 500; color: ${colors.text};">${character.name}${isDuplicate ? ' <span style="color: #999; font-size: 11px;">(已存在)</span>' : ''}</span>
                                    </p>
                                    <p style="margin: 2px 0 0 0; font-size: 11px; color: ${colors.subText}; line-height: 1.3;">
                                        <span>bgm_id=${character.id}</span>
                                    </p>
                                    ${cvSelectionHtml}
                                </div>
                            </li>
                        `;
                    });
                } else {
                    modalHtml += `
                        <li class="clearit" style="margin: 10px 0; padding: 10px; text-align: center; color: ${colors.subText};">
                            此条目未关联角色
                        </li>
                    `;
                }
                
                modalHtml += `
                        </ul>
                    </div>
                `;
                
                $(relatedSubjectsModal).after(modalHtml);
                
                $(document).on('click', '#chitanda_character_selection_modal input[type="checkbox"], #chitanda_character_selection_modal label', function(e) {
                    e.stopPropagation(); 
                });
                
                $(document).on('change', '#chitanda_character_selection_modal input[type="checkbox"]', function() {
                    var $this = $(this);
                    var $parent = $this.closest('li');
                    var $checkboxes = $parent.find('input[type="checkbox"]');
                    
                    if ($this.attr('name').includes('_none') && $this.is(':checked')) {
                        $checkboxes.not('[name*="_none"]').prop('checked', false);
                    } else if (!$this.attr('name').includes('_none') && $this.is(':checked')) {
                        $parent.find('input[type="checkbox"][name*="_none"]').prop('checked', false);
                    }
                });
                
                $(document).on('mouseenter', '#chitanda_character_selection_modal li.clearit[data-char-id]', function() {
                    var colors = getThemeColors();
                    $(this).css('background', colors.hoverBg);
                });
                
                $(document).on('mouseleave', '#chitanda_character_selection_modal li.clearit[data-char-id]', function() {
                    $(this).css('background', 'transparent');
                });
                
                $(document).on('click', '#chitanda_character_selection_modal li.clearit[data-char-id]', function(e) {
                    e.preventDefault();
                    
                    var charId = $(this).data('char-id');
                    var cvIdsStr = $(this).data('cv-ids');
                    var cvNamesStr = $(this).data('cv-names');
                    
                    if (!charId) return;
                    
                    var cvIds = [];
                    var associateCv = false;
                    
                    if (cvIdsStr) {
                        var $selectedCheckboxes = $(this).find('input[type="checkbox"]:checked');
                        if ($selectedCheckboxes.length > 0) {
                            $selectedCheckboxes.each(function() {
                                var value = $(this).val();
                                if (value) {
                                    cvIds.push(value);
                                }
                            });
                            associateCv = cvIds.length > 0;
                        }
                    }
                    
                    var charName = $(this).find('span[style*="font-weight: 500"]').text().trim();
                    
                    var selectedCharacter = {
                        id: charId,
                        name: charName,
                        cvIds: cvIds,
                        associateCv: associateCv
                    };
                    
                    chitanda_association_queue.push(selectedCharacter);
                    
                    $(this).remove();
                    
                    if (!chitanda_is_associating) {
                        setTimeout(function() {
                            chitanda_process_association_queue();
                        }, 100);
                    } else {
                        $('.chitanda_all_num').text(chitanda_association_queue.length + 1);
                    }
                });
                
                return;
            } else {
                const wikiPanel = document.getElementById('chitanda_wiki_panel');
                if (wikiPanel) {
                    $(wikiPanel).append(selectionHtml);
                } else {
                    $('.chitanda_character_wrapper').append(selectionHtml);
                }
            }
        } else {
            $('.chitanda_character_wrapper').append(selectionHtml);
        }
        
        $(document).on('click', '#chitanda_character_selection input[type="checkbox"], #chitanda_character_selection label', function(e) {
            e.stopPropagation(); 
        });
        
        // 处理CV选择逻辑
        $(document).on('change', '#chitanda_character_selection input[type="checkbox"]', function() {
            var $this = $(this);
            var $parent = $this.closest('li');
            var $checkboxes = $parent.find('input[type="checkbox"]');
            
            // 如果选择了"不关联CV"，取消其他所有CV的选择
            if ($this.attr('name').includes('_none') && $this.is(':checked')) {
                $checkboxes.not('[name*="_none"]').prop('checked', false);
            } else if (!$this.attr('name').includes('_none') && $this.is(':checked')) {
                // 如果选择了任何CV，取消"不关联CV"的选择
                $parent.find('input[type="checkbox"][name*="_none"]').prop('checked', false);
            }
        });
        
        $(document).on('mouseenter', '#chitanda_character_selection li.clearit[data-char-id]', function() {
            var colors = getThemeColors();
            $(this).css('background', colors.hoverBg);
        });
        
        $(document).on('mouseleave', '#chitanda_character_selection li.clearit[data-char-id]', function() {
            $(this).css('background', 'transparent');
        });
        
        $(document).on('click', '#chitanda_character_selection li.clearit[data-char-id]', function(e) {
            e.preventDefault();
            
            var charId = $(this).data('char-id');
            var index = $(this).data('index');
            var cvIdsStr = $(this).data('cv-ids');
            var cvNamesStr = $(this).data('cv-names');
            
            if (!charId) return;
            
            var cvIds = [];
            var associateCv = false;
            
            if (cvIdsStr) {
                var $selectedCheckboxes = $(this).find('input[type="checkbox"]:checked');
                if ($selectedCheckboxes.length > 0) {
                    $selectedCheckboxes.each(function() {
                        var value = $(this).val();
                        if (value) { // 排除"不关联CV"选项
                            cvIds.push(value);
                        }
                    });
                    associateCv = cvIds.length > 0;
                }
            }
            
            var charName = $(this).find('span[style*="font-weight: 500"]').text().trim();
            
            var selectedCharacter = {
                id: charId,
                name: charName,
                cvIds: cvIds,
                associateCv: associateCv
            };
            
            chitanda_association_queue.push(selectedCharacter);
            
            $(this).remove();
            
            if (!chitanda_is_associating) {
                setTimeout(function() {
                    chitanda_process_association_queue();
                }, 100);
            } else {
                $('.chitanda_all_num').text(chitanda_association_queue.length + 1);
            }
        });
    }
    
    window.chitanda_filter_characters = function(keyword) {
        var searchTerm = keyword.toLowerCase().trim();
        var allItems = document.querySelectorAll('#chitanda_subjectList li.clearit');
        var parentList = document.getElementById('chitanda_subjectList');
        
        if (!parentList) return;
        
        if (searchTerm === '') {
            parentList.style.display = 'block';
            allItems.forEach(function(item) {
                item.style.display = '';
                item.style.order = '';
            });
            return;
        }
        
        parentList.style.display = 'flex';
        parentList.style.flexDirection = 'column';
        
        allItems.forEach(function(item) {
            if (item.querySelector('#chitanda_character_search')) {
                item.style.display = '';
                item.style.order = '0';
                return;
            }
            
            var itemText = item.textContent.toLowerCase();
            
            if (itemText.includes(searchTerm)) {
                item.style.display = '';
                item.style.order = '1';
            } else {
                item.style.display = 'none';
                item.style.order = '2';
            }
        });
    }
    
    window.chitanda_filter_characters_modal = function(keyword) {
        var searchTerm = keyword.toLowerCase().trim();
        var allItems = document.querySelectorAll('#chitanda_subjectList_modal li.clearit');
        var parentList = document.getElementById('chitanda_subjectList_modal');
        
        if (!parentList) return;
        
        if (searchTerm === '') {
            parentList.style.display = 'block';
            allItems.forEach(function(item) {
                item.style.display = '';
                item.style.order = '';
            });
            return;
        }
        
        parentList.style.display = 'flex';
        parentList.style.flexDirection = 'column';
        
        allItems.forEach(function(item) {
            if (item.querySelector('#chitanda_character_search_modal')) {
                item.style.display = '';
                item.style.order = '0';
                return;
            }
            
            var itemText = item.textContent.toLowerCase();
            
            if (itemText.includes(searchTerm)) {
                item.style.display = '';
                item.style.order = '1';
            } else {
                item.style.display = 'none';
                item.style.order = '2';
            }
        });
    }
    
    if (typeof genCharacterList === 'undefined') {
        window.genCharacterList = function(subject, index, type) {
            var html = '<li>';
            html += `<a href="/character/${subject.id}" class="avatar h" data-id="${subject.id}">`;
            html += `<img src="${subject.images ? subject.images.small : ''}" alt="${subject.name}">`;
            html += `<span class="l">${subject.name}</span>`;
            html += '</a>';
            html += '</li>';
            return html;
        };
    }
    
    function chitanda_process_association_queue() {
        if (chitanda_association_queue.length === 0) {
            chitanda_is_associating = false;
            
            var colors = getThemeColors();
            if ($('.chitanda_progress').length > 0) {
                var progressText = $('.chitanda_progress').text();
                $('.chitanda_progress').append(` <span style="color: #4caf50; font-size: 14px;">✓ 添加完成！</span>`);
                
                setTimeout(function() {
                    $('.chitanda_progress').find('span:last-child').fadeOut(2000, function() {
                        $(this).remove();
                    });
                }, 3000);
            }
            
            return;
        }
        
        chitanda_is_associating = true;
        
        var totalCharacters = chitanda_association_queue.length + 1;
        
        if ($('.chitanda_current_idx').length > 0) {
            $('.chitanda_current_idx').text(1);
        }
        if ($('.chitanda_all_num').length > 0) {
            $('.chitanda_all_num').text(totalCharacters);
        }
        
        var character = chitanda_association_queue.shift();
        
        ctd_findCharacterFunc([character], 0, function() {
            setTimeout(function() {
                chitanda_process_association_queue();
            }, 500); 
        });
    }

    setupThemeObserver();
    
    if (isAddRelatedPage) {
        var colors = getThemeColors();
        $('.subjectListWrapper').after(`
            <div class="chitanda_character_wrapper">
                <div class="chitanda_progress" style="margin: 15px 0;font-size:20px;font-weight:bold; color: ${colors.primary};">
                    添加进度：<span class="chitanda_current_idx">0</span>/<span class="chitanda_all_num">0</span>
                </div>
                <h3 style="margin: 10px 0; color: ${colors.text};">已添加的角色：</h3>
                <div class="chitanda_character_added" style="min-height:30px; max-height: 30px; overflow-y: auto; margin-bottom: 10px; padding: 5px; border: 1px dashed ${colors.border}; border-radius: 4px; width: 318.34px;"></div>
                <h3 style="margin: 10px 0; color: ${colors.text};">添加失败：</h3>
                <div class="chitanda_character_not_found" style="min-height:40px"></div>
                <hr style="margin: 20px 0; border-color: ${colors.border};">
                <h3 style="margin: 10px 0; color: ${colors.text};">从条目获取角色</h3>
                <div style="margin: 5px;padding:5px 0; background: ${colors.inputBg}; width: 318.34px;">
                    <select id="chitanda_search_type" style="padding: 5px; margin-right: 5px;">
                        <option value="id">通过ID搜索</option>
                        <option value="name" selected>通过名称搜索</option>
                    </select>
                    <input type="text" id="chitanda_related_subject_id" placeholder="输入条目ID或名称" style="padding: 5px; width: 120px;">
                    <input type="button" id="btn_ctd_fetch_characters" class="searchBtnL" value="搜索" style="padding: 5px 10px; margin-left: 5px;">
                    <span id="chitanda_fetch_status" style="margin-left: 5px; font-size: 12px;"></span>
                </div>
                <div id="chitanda_subject_info" style="margin: 5px 0; padding: 5px; font-size: 12px; color: ${colors.subText};"></div>
                <div id="chitanda_search_results" style="margin: 5px 0; padding: 5px; border: 1px solid ${colors.border}; background: ${colors.bg}; max-height: 200px; overflow-y: auto; display: none; width: 318.34px;"></div>
                <hr style="margin: 20px 0; border-color: ${colors.border};">
                <h3 style="margin: 10px 0; color: ${colors.text};">显示关联条目</h3>
                <div style="margin: 5px;padding:5px 0; background: ${colors.inputBg}; width: 318.34px;">
                    <input type="button" id="btn_ctd_fetch_related" class="searchBtnL" value="显示关联条目" style="padding: 5px 10px;">
                    <label style="display: inline-block; margin-left: 5px; cursor: pointer;">
                        <input type="checkbox" id="chitanda_deduplicate" checked style="margin-right: 3px;">
                        <span style="font-size: 12px; color: ${colors.text};" title="隐藏重复角色">去重</span>
                    </label>
                    <span id="chitanda_related_status" style="margin-left: 5px; font-size: 12px;"></span>
                </div>
                <div id="chitanda_related_subjects" style="margin: 10px 0; max-height: 100px; overflow-y: auto; border: 1px solid ${colors.border}; padding: 10px; width: 298.34px;">
                    <!-- 关联条目列表将显示在这里 -->
                </div>
            </div>
        `);
    } else if (isSubjectPage) {
        var colors = getThemeColors();
        $('#columnInSubjectA').append(`
            <div class="chitanda_character_wrapper" style="margin-top: 20px; padding: 10px; border: 1px solid ${colors.border}; background: ${colors.bg};">
                <h2 class="section_title" style="margin-bottom: 15px; color: ${colors.text};">WIKI批量关联角色</h2>
                <div class="chitanda_progress" style="margin: 15px 0;font-size:16px;font-weight:bold; color: ${colors.primary};">
                    添加进度：<span class="chitanda_current_idx">0</span>/<span class="chitanda_all_num">0</span>
                </div>
                <h3 style="margin: 10px 0; color: ${colors.text};">添加失败：</h3>
                <div class="chitanda_character_not_found" style="min-height:40px"></div>
                <hr style="margin: 20px 0; border-color: ${colors.border};">
                <h3 style="margin: 10px 0; color: ${colors.text};">从条目获取角色</h3>
                <div style="margin: 5px;padding:5px 0; background: ${colors.inputBg};">
                    <select id="chitanda_search_type" style="padding: 5px; margin-right: 5px;">
                        <option value="id">通过ID搜索</option>
                        <option value="name" selected>通过名称搜索</option>
                    </select>
                    <input type="text" id="chitanda_related_subject_id" placeholder="输入条目ID或名称" style="padding: 5px; width: 120px;">
                    <input type="button" id="btn_ctd_fetch_characters" class="searchBtnL" value="搜索" style="padding: 5px 10px; margin-left: 5px;">
                    <span id="chitanda_fetch_status" style="margin-left: 5px; font-size: 12px;"></span>
                </div>
                <div id="chitanda_subject_info" style="margin: 5px 0; padding: 5px; font-size: 12px; color: ${colors.subText};"></div>
                <div id="chitanda_search_results" style="margin: 5px 0; padding: 5px; border: 1px solid ${colors.border}; background: ${colors.bg}; max-height: 200px; overflow-y: auto; display: none;"></div>
                <hr style="margin: 20px 0; border-color: ${colors.border};">
                <h3 style="margin: 10px 0; color: ${colors.text};">显示关联条目</h3>
                <div style="margin: 5px;padding:5px 0; background: ${colors.inputBg};">
                    <input type="button" id="btn_ctd_fetch_related" class="searchBtnL" value="显示关联条目" style="padding: 5px 10px;">
                    <label style="display: inline-block; margin-left: 5px; cursor: pointer;">
                        <input type="checkbox" id="chitanda_deduplicate" checked style="margin-right: 3px;">
                        <span style="font-size: 12px; color: ${colors.text};" title="隐藏重复角色">去重</span>
                    </label>
                    <span id="chitanda_related_status" style="margin-left: 5px; font-size: 12px;"></span>
                </div>
                <div id="chitanda_related_subjects" style="margin: 10px 0; max-height: 100px; overflow-y: auto; border: 1px solid ${colors.border}; padding: 10px; width: 298.34px;">
                    <!-- 关联条目列表将显示在这里 -->
                </div>
            </div>
        `);
    }
    
    if (isAddRelatedPage || isSubjectPage) {
        $('#btn_ctd_fetch_related').on('click', chitanda_FetchRelatedSubjects);
        
        $(document).on('change', '#chitanda_deduplicate, #ctd_wiki_deduplicate_modal', function() {
             var isChecked = $(this).is(':checked');
             var targetList = $(this).closest('.chitanda_character_wrapper, #chitanda_wiki_panel, #chitanda_character_selection_modal').find('li.clearit[data-char-id][data-is-duplicate="true"]');
             if (targetList.length === 0) {
                 targetList = $('#chitanda_subjectList li.clearit[data-char-id][data-is-duplicate="true"], #chitanda_subjectList_modal li.clearit[data-char-id][data-is-duplicate="true"]');
             }
             targetList.each(function() {
                 if (isChecked) {
                     $(this).hide();
                 } else {
                     $(this).show();
                 }
             });
         });
        
        $('#btn_ctd_fetch_characters').on('click', function() {
            var inputVal = $('#chitanda_related_subject_id').val().trim();
            var searchType = $('#chitanda_search_type').val();
            
            if (!inputVal) {
                alert('请输入关联条目ID或名称');
                return;
            }
            
            if (searchType === 'id') {
                if (/^\d+$/.test(inputVal)) {
                    $('#chitanda_subject_info').text('正在查询...');
                    fetch('https://api.bgm.tv/v0/subjects/' + inputVal, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.id) {
                            var colors = getThemeColors();
                            var cover = data.images && data.images.small ? data.images.small : '//lain.bgm.tv/img/no_icon_subject.png';
                            if (cover && !cover.startsWith('http')) {
                                cover = 'https:' + cover;
                            }
                            var resultsHtml = '<ul style="margin: 0; padding: 0; list-style: none;">';
                            resultsHtml += `
                                <li style="margin: 5px 0; padding: 5px; border-bottom: 1px solid ${colors.border}; cursor: pointer;" data-id="${data.id}" data-name="${data.name}">
                                    <div style="display: flex; align-items: center;">
                                        <img src="${cover}" width="30" height="30" style="margin-right: 10px; border-radius: 4px;">
                                        <div>
                                            <div style="font-weight: bold; color: ${colors.text};">${data.name}</div>
                                            <div style="font-size: 12px; color: ${colors.subText};">${data.name_cn || ''}</div>
                                        </div>
                                    </div>
                                </li>
                            `;
                            resultsHtml += '</ul>';
                            $('#chitanda_search_results').html(resultsHtml).show();
                            $('#chitanda_subject_info').text('找到 1 个匹配结果');
                            
                            $('#chitanda_search_results li').hover(
                                function() {
                                    var colors = getThemeColors();
                                    $(this).css('background', colors.hoverBg);
                                },
                                function() {
                                    $(this).css('background', 'transparent');
                                }
                            );
                            
                            $('#chitanda_search_results li').on('click', function() {
                                var subjectId = $(this).data('id');
                                var subjectName = $(this).data('name');
                                $('#chitanda_related_subject_id').val(subjectName);
                                $('#chitanda_subject_info').text('条目名称: ' + subjectName);
                                $('#chitanda_search_results').hide();
                                chitanda_FetchFromRelatedSubjectWithId(subjectId, subjectName);
                            });
                        } else {
                            $('#chitanda_subject_info').text('未找到条目信息');
                            $('#chitanda_search_results').hide();
                        }
                    })
                    .catch(error => {
                        $('#chitanda_subject_info').text('查询出错，请检查网络连接');
                        $('#chitanda_search_results').hide();
                    });
                } else {
                    alert('请输入有效的条目ID');
                    return;
                }
            } else if (searchType === 'name') {
                $('#chitanda_subject_info').text('正在搜索...');
                
                fetch('https://api.bgm.tv/v0/search/subjects', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    body: JSON.stringify({
                        keyword: inputVal,
                        filter: {
                            type: null,
                            nsfw: true
                        },
                        page: 1,
                        limit: 10
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.data && data.data.length > 0) {
                        var colors = getThemeColors();
                        var resultsHtml = '<ul style="margin: 0; padding: 0; list-style: none;">';
                        data.data.forEach(function(item) {
                            var cover = item.images && item.images.small ? item.images.small : '//lain.bgm.tv/img/no_icon_subject.png';
                            if (cover && !cover.startsWith('http')) {
                                cover = 'https:' + cover;
                            }
                            resultsHtml += `
                                <li style="margin: 5px 0; padding: 5px; border-bottom: 1px solid ${colors.border}; cursor: pointer;" data-id="${item.id}" data-name="${item.name}">
                                    <div style="display: flex; align-items: center;">
                                        <img src="${cover}" width="30" height="30" style="margin-right: 10px; border-radius: 4px;">
                                        <div>
                                            <div style="font-weight: bold; color: ${colors.text};">${item.name}</div>
                                            <div style="font-size: 12px; color: ${colors.subText};">${item.name_cn || ''}</div>
                                        </div>
                                    </div>
                                </li>
                            `;
                        });
                        resultsHtml += '</ul>';
                        $('#chitanda_search_results').html(resultsHtml).show();
                        $('#chitanda_subject_info').text('找到 ' + data.data.length + ' 个匹配结果');
                        
                        $('#chitanda_search_results li').hover(
                            function() {
                                var colors = getThemeColors();
                                $(this).css('background', colors.hoverBg);
                            },
                            function() {
                                $(this).css('background', 'transparent');
                            }
                        );
                        
                        $('#chitanda_search_results li').on('click', function() {
                            var subjectId = $(this).data('id');
                            var subjectName = $(this).data('name');
                            $('#chitanda_related_subject_id').val(subjectName);
                            $('#chitanda_subject_info').text('条目名称: ' + subjectName);
                            $('#chitanda_search_results').hide();
                            chitanda_FetchFromRelatedSubjectWithId(subjectId, subjectName);
                        });
                    } else {
                        $('#chitanda_subject_info').text('未找到匹配的条目');
                        $('#chitanda_search_results').hide();
                    }
                })
                .catch(error => {
                    $('#chitanda_subject_info').text('搜索出错，请检查网络连接');
                    $('#chitanda_search_results').hide();
                });
            }
        });
        
        $(document).on('click', function(e) {
            if (!$(e.target).closest('#chitanda_related_subject_id, #chitanda_search_results').length) {
                $('#chitanda_search_results').hide();
            }
        });
        

    }
    
    var chitanda_FetchRelatedSubjects = function() {
        try {
            var currentUrl = window.location.href;
            var subjectIdMatch;
            
            if (isAddRelatedPage) {
                subjectIdMatch = currentUrl.match(/subject\/(\d+)\/add_related\/character/);
            } else if (isSubjectPage) {
                subjectIdMatch = currentUrl.match(/subject\/(\d+)$/);
            }
            
            if (!subjectIdMatch) {
                alert('无法获取当前条目ID');
                return;
            }
            var currentSubjectId = subjectIdMatch[1];
            
            $('#chitanda_related_status').text('正在显示关联条目...');
            
            $('#chitanda_related_subjects').show();
            
            fetch('/subject/' + currentSubjectId + '/relations', {
                credentials: 'include', 
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            })
                .then(response => {
                    return response.text();
                })
                .then(html => {
                    try {
                        
                        var $html = $(html);
                        var relatedSubjects = [];
                        
                        
                        var sections = $html.find('#columnInSubjectA .section');
                        
                        sections.each(function() {
                            var $section = $(this);
                            
                            var $h2 = $section.prevAll('h2.section_title').first();
                            var category = $h2 ? $h2.text().trim() : '未知分类';
                         
                            var items = $section.find('ul.browser-list li.item');
                            
                            items.each(function() {
                                var $item = $(this);
                                
                                var $link = $item.find('h3 a.l') || $item.find('a.subjectCover');
                                if ($link.length > 0) {
                                    var href = $link.attr('href');
                                    if (href) {
                                        var idMatch = href.match(/subject\/(\d+)/);
                                        if (idMatch) {
                                            var id = idMatch[1];
                                            var name = $item.find('h3 a.l').text().trim();
                                            var $cover = $item.find('img.cover');
                                            var coverImage = $cover.attr('src') || '//lain.bgm.tv/img/no_icon_subject.png';
                                            if (coverImage && !coverImage.startsWith('http')) {
                                                coverImage = 'https:' + coverImage;
                                            }
                                            if (name) {
                                                relatedSubjects.push({id: id, name: name, category: category, cover: coverImage});

                                            }
                                        }
                                    }
                                }
                            });
                        });
                        
                        if (relatedSubjects.length === 0) {
                            
                            return fetch('/subject/' + currentSubjectId, {
                                credentials: 'include',
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                                }
                            })
                            .then(response => response.text())
                            .then(mainHtml => {
                                var $mainHtml = $(mainHtml);
                                var mainItems = $mainHtml.find('.content_inner .browserCoverMedium.clearit li.sep');
                                
                                mainItems.each(function() {
                                    var $subject = $(this);
                                    var $link = $subject.find('a.title') || $subject.find('a.avatar') || $subject.find('a');
                                    
                                    if ($link.length > 0) {
                                        var href = $link.attr('href');
                                        if (href) {
                                            var idMatch = href.match(/subject\/(\d+)/);
                                            if (idMatch) {
                                                var id = idMatch[1];
                                                var name = $subject.find('a.title').text().trim() || $link.text().trim();
                                                if (name && !name.includes('关联条目') && !name.includes('更多关联')) {
                                                    relatedSubjects.push({id: id, name: name, category: '关联条目'});
    
                                                }
                                            }
                                        }
                                    }
                                });
                                
                                return relatedSubjects;
                            });
                        }
                        
                        return relatedSubjects;
                    } catch (error) {
                        return [];
                    }
                })
                .then(relatedSubjects => {
                    if (relatedSubjects.length > 0) {
                        var colors = getThemeColors();
                        var htmlContent = '<ul style="list-style: none; padding: 0; margin: 0;">';
                        relatedSubjects.forEach(function(subject) {
                            var cover = subject.cover || '//lain.bgm.tv/img/no_icon_subject.png';
                            if (cover && !cover.startsWith('http')) {
                                cover = 'https:' + cover;
                            }
                            htmlContent += `
                                <li class="clearit chitanda_related_item" style="margin-bottom: 10px; cursor: pointer; padding: 5px; border-bottom: 1px solid ${colors.border};" data-id="${subject.id}" data-name="${subject.name}">
                                    <a href="/subject/${subject.id}" class="avatar h" style="display: block; float: left; margin-right: 10px;">
                                        <img src="${cover}" class="avatar ll" width="50" style="border-radius: 4px;">
                                    </a>
                                    <div class="inner" style="overflow: hidden;">
                                        <p style="margin: 0;">
                                            <a href="/subject/${subject.id}" class="avatar h" style="font-weight: bold; color: ${colors.text};">${subject.name}</a>
                                        </p>
                                        <small class="tip" style="color: ${colors.subText};">${subject.category || '未知'}</small>
                                    </div>
                                </li>
                            `;
                        });
                        htmlContent += '</ul>';
                        
                        var groupedSubjects = {};
                        relatedSubjects.forEach(function(subject) {
                            var category = subject.category || '未知分类';
                            if (!groupedSubjects[category]) {
                                groupedSubjects[category] = [];
                            }
                            groupedSubjects[category].push(subject);
                        });
                        
                        var listHtml = '<ul style="list-style: none; padding: 0; margin: 0;">';
                        Object.keys(groupedSubjects).forEach(function(category) {
                            if (groupedSubjects[category].length > 0) {
                                var colors = getThemeColors();
                        listHtml += '<li class="sub_title" style="font-weight: bold; margin: 10px 0; padding: 5px 0; border-top: 1px solid ' + colors.border + '; border-bottom: 1px solid ' + colors.border + '; color: ' + colors.text + ';">' + category + '</li>';
                                groupedSubjects[category].forEach(function(subject) {
                                    var cover = subject.cover || '//lain.bgm.tv/img/no_icon_subject.png';
                                    if (cover && !cover.startsWith('http')) {
                                        cover = 'https:' + cover;
                                    }
                                    listHtml += `
                                        <li class="clearit chitanda_related_item" style="margin-bottom: 10px; cursor: pointer; padding: 5px; border-bottom: 1px solid ${colors.border};" data-id="${subject.id}" data-name="${subject.name}">
                                            <a href="/subject/${subject.id}" class="avatar h" style="display: block; float: left; margin-right: 10px;">
                                                <img src="${cover}" class="avatar ll" width="50" style="border-radius: 4px;">
                                            </a>
                                            <div class="inner" style="overflow: hidden;">
                                                <p style="margin: 0;">
                                                    <a href="/subject/${subject.id}" class="avatar h" style="font-weight: bold; color: ${colors.text};">${subject.name}</a>
                                                </p>
                                                <small class="tip" style="color: ${colors.subText};">${subject.category || '未知'}</small>
                                            </div>
                                        </li>
                                    `;
                                });
                            }
                        });
                        listHtml += '</ul>';
                        htmlContent = listHtml;
                        $('#chitanda_related_subjects').html(htmlContent);
                        $('#chitanda_related_status').text(`成功提取 ${relatedSubjects.length} 个关联条目`);
                        
                        $('.chitanda_related_item').hover(
                            function() {
                                var colors = getThemeColors();
                                $(this).css('background', colors.hoverBg);
                            },
                            function() {
                                $(this).css('background', 'transparent');
                            }
                        );
                        
                        $('.chitanda_related_item a').on('click', function(e) {
                            e.preventDefault();
                        });
                        
                        $('.chitanda_related_item').on('click', function() {
                            var subjectId = $(this).data('id');
                            var subjectName = $(this).data('name');
                            
                            $('#chitanda_related_subject_id').val(subjectName);
                            $('#chitanda_subject_info').text('条目名称: ' + subjectName);
                            
                            $('#chitanda_related_subjects').hide();
                            
                            chitanda_FetchFromRelatedSubjectWithId(subjectId, subjectName);
                        });
                    } else {
                            $('#chitanda_related_subjects').html('<p>未找到关联条目</p>');
                            $('#chitanda_related_status').text('未找到关联条目');
                        }
                })
                .catch(error => {
                    $('#chitanda_related_status').text('提取失败，请检查网络连接');
                });
        } catch (error) {
            $('#chitanda_related_status').text('显示关联条目时出错');
        }
    };
    
    var chitanda_FetchRelatedSubjectsModal = function() {
        try {
            var currentUrl = window.location.href;
            var subjectIdMatch;
            
            if (isAddRelatedPage) {
                subjectIdMatch = currentUrl.match(/subject\/(\d+)\/add_related\/character/);
            } else if (isSubjectPage) {
                subjectIdMatch = currentUrl.match(/subject\/(\d+)$/);
            }
            
            if (!subjectIdMatch) {
                alert('无法获取当前条目ID');
                return;
            }
            var currentSubjectId = subjectIdMatch[1];
            
            const statusElement = document.getElementById('ctd_wiki_related_status_modal');
            if (statusElement) {
                statusElement.textContent = '正在显示关联条目...';
            }
            
            const relatedSubjectsContainer = document.getElementById('ctd_wiki_related_subjects_modal');
            if (relatedSubjectsContainer) {
                relatedSubjectsContainer.style.display = 'block';
            }
            
            fetch('/subject/' + currentSubjectId + '/relations', {
                credentials: 'include', 
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            })
                .then(response => {
                    return response.text();
                })
                .then(html => {
                    try {
                        var $html = $(html);
                        var relatedSubjects = [];
                        
                        var sections = $html.find('#columnInSubjectA .section');
                        
                        sections.each(function() {
                            var $section = $(this);
                            
                            var $h2 = $section.prevAll('h2.section_title').first();
                            var category = $h2 ? $h2.text().trim() : '未知分类';
                         
                            var items = $section.find('ul.browser-list li.item');
                            
                            items.each(function() {
                                var $item = $(this);
                                
                                var $link = $item.find('h3 a.l') || $item.find('a.subjectCover');
                                if ($link.length > 0) {
                                    var href = $link.attr('href');
                                    if (href) {
                                        var idMatch = href.match(/subject\/(\d+)/);
                                        if (idMatch) {
                                            var id = idMatch[1];
                                            var name = $item.find('h3 a.l').text().trim();
                                            var $cover = $item.find('img.cover');
                                            var coverImage = $cover.attr('src') || '//lain.bgm.tv/img/no_icon_subject.png';
                                            if (coverImage && !coverImage.startsWith('http')) {
                                                coverImage = 'https:' + coverImage;
                                            }
                                            if (name) {
                                                relatedSubjects.push({id: id, name: name, category: category, cover: coverImage});
                                            }
                                        }
                                    }
                                }
                            });
                        });
                        
                        if (relatedSubjects.length === 0) {
                            return fetch('/subject/' + currentSubjectId, {
                                credentials: 'include',
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                                }
                            })
                            .then(response => response.text())
                            .then(mainHtml => {
                                var $mainHtml = $(mainHtml);
                                var mainItems = $mainHtml.find('.content_inner .browserCoverMedium.clearit li.sep');
                                
                                mainItems.each(function() {
                                    var $subject = $(this);
                                    var $link = $subject.find('a.title') || $subject.find('a.avatar') || $subject.find('a');
                                    
                                    if ($link.length > 0) {
                                        var href = $link.attr('href');
                                        if (href) {
                                            var idMatch = href.match(/subject\/(\d+)/);
                                            if (idMatch) {
                                                var id = idMatch[1];
                                                var name = $subject.find('a.title').text().trim() || $link.text().trim();
                                                if (name && !name.includes('关联条目') && !name.includes('更多关联')) {
                                                    relatedSubjects.push({id: id, name: name, category: '关联条目'});
                                                }
                                            }
                                        }
                                    }
                                });
                                
                                return relatedSubjects;
                            });
                        }
                        
                        return relatedSubjects;
                    } catch (error) {
                        return [];
                    }
                })
                .then(relatedSubjects => {
                    const subjectsContainer = document.getElementById('ctd_wiki_related_subjects_modal');
                    if (relatedSubjects.length > 0 && subjectsContainer) {
                        var colors = getThemeColors();
                        var htmlContent = '<ul style="list-style: none; padding: 0; margin: 0;">';
                        relatedSubjects.forEach(function(subject) {
                            var cover = subject.cover || '//lain.bgm.tv/img/no_icon_subject.png';
                            if (cover && !cover.startsWith('http')) {
                                cover = 'https:' + cover;
                            }
                            htmlContent += `
                                <li class="clearit ctd_wiki_related_item_modal" style="margin-bottom: 10px; cursor: pointer; padding: 5px; border-bottom: 1px solid ${colors.border};" data-id="${subject.id}" data-name="${subject.name}">
                                    <a href="/subject/${subject.id}" class="avatar h" style="display: block; float: left; margin-right: 10px;">
                                        <img src="${cover}" class="avatar ll" width="50" style="border-radius: 4px;">
                                    </a>
                                    <div class="inner" style="overflow: hidden;">
                                        <p style="margin: 0;">
                                            <a href="/subject/${subject.id}" class="avatar h" style="font-weight: bold; color: ${colors.text};">${subject.name}</a>
                                        </p>
                                        <small class="tip" style="color: ${colors.subText};">${subject.category || '未知'}</small>
                                    </div>
                                </li>
                            `;
                        });
                        htmlContent += '</ul>';
                        subjectsContainer.innerHTML = htmlContent;
                        
                        if (statusElement) {
                            statusElement.textContent = `成功提取 ${relatedSubjects.length} 个关联条目`;
                        }
                        
                        const resultItems = subjectsContainer.querySelectorAll('.ctd_wiki_related_item_modal');
                        resultItems.forEach(function(item) {
                            item.addEventListener('mouseover', function() {
                                var colors = getThemeColors();
                                this.style.background = colors.hoverBg;
                            });
                            item.addEventListener('mouseout', function() {
                                this.style.background = 'transparent';
                            });
                            
                            const links = item.querySelectorAll('a');
                            links.forEach(function(link) {
                                link.addEventListener('click', function(e) {
                                    e.preventDefault();
                                });
                            });
                            
                            item.addEventListener('click', function() {
                                var subjectId = this.getAttribute('data-id');
                                var subjectName = this.getAttribute('data-name');
                                
                                const inputElement = document.getElementById('ctd_wiki_related_subject_id_modal');
                                const infoElement = document.getElementById('ctd_wiki_subject_info_modal');
                                if (inputElement) {
                                    inputElement.value = subjectName;
                                }
                                if (infoElement) {
                                    infoElement.textContent = '条目名称: ' + subjectName;
                                }
                                
                                const relatedSubjectsContainer = document.getElementById('ctd_wiki_related_subjects_modal');
                                if (relatedSubjectsContainer) {
                                    relatedSubjectsContainer.style.display = 'none';
                                }
                                
                                chitanda_FetchFromRelatedSubjectWithId(subjectId, subjectName);
                            });
                        });
                    } else {
                        if (subjectsContainer) {
                            subjectsContainer.innerHTML = '<p>未找到关联条目</p>';
                        }
                        if (statusElement) {
                            statusElement.textContent = '未找到关联条目';
                        }
                    }
                })
                .catch(error => {
                    if (statusElement) {
                        statusElement.textContent = '提取失败，请检查网络连接';
                    }
                });
        } catch (error) {
            if (statusElement) {
                statusElement.textContent = '显示关联条目时出错';
            }
        }
    };
    
    if (isAddRelatedPage) {
        $('#btn_ctd_multi_search').on('click', chitanda_MultiFindCharacterFunc);
    }
    
    $('#btn_ctd_fetch_related').on('click', chitanda_FetchRelatedSubjects);
    
    function adaptToBangumiBatchPanel() {
        if (!isSubjectPage) return;
        if (document.getElementById('bgm-batch-modal')) {
            if (document.getElementById('chitanda_wiki_panel')) {
                return true;
            }
            
            if (typeof genCharacterList === 'undefined') {
                window.genCharacterList = function(subject, index, type) {
                    var html = '<li>';
                    html += `<a href="/character/${subject.id}" class="avatar h" data-id="${subject.id}">`;
                    html += `<img src="${subject.images ? subject.images.small : ''}" alt="${subject.name}">`;
                    html += `<span class="l">${subject.name}</span>`;
                    html += '</a>';
                    html += '</li>';
                    return html;
                };
            }
            
            const saveBtn = document.getElementById('bgm-btn-save');
            if (saveBtn) {
                saveBtn.addEventListener('click', function() {

                });
            }
            
            const relationTable = document.getElementById('bgm-relation-table');
            if (relationTable) {

                
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.gap = '20px';
                container.style.width = '100%';
                container.style.height = '100%';
                
                const tableParent = relationTable.parentNode;
                
                tableParent.removeChild(relationTable);
                
                var colors = getThemeColors();
                const wikiPanel = document.createElement('div');
                wikiPanel.id = 'chitanda_wiki_panel';
                wikiPanel.style.flex = '1';
                wikiPanel.style.minWidth = '300px';
                wikiPanel.style.padding = '10px';
                wikiPanel.style.border = '1px solid ' + colors.border;
                wikiPanel.style.background = colors.bg;
                wikiPanel.style.borderRadius = '6px';
                wikiPanel.style.boxSizing = 'border-box';
                wikiPanel.style.overflow = 'auto';
                
                wikiPanel.innerHTML = `
                    <div style="display: flex; flex-direction: column; height: 100%;">
                        <h3 style="margin-top: 0; color: ${colors.primary}; font-size: 14px;">关联条目角色</h3>
                        <div class="chitanda_progress" style="margin: 10px 0;font-size:12px;font-weight:bold; color: ${colors.primary};">
                            添加进度：<span class="chitanda_current_idx">0</span>/<span class="chitanda_all_num">0</span>
                        </div>
                        <h4 style="margin: 10px 0; color: ${colors.text}; font-size: 13px;">已添加：</h4>
                        <div class="chitanda_character_added_modal" style="min-height: 30px; max-height: 60px; overflow-y: auto; margin-bottom: 10px; padding: 5px; border: 1px dashed ${colors.border}; border-radius: 4px; width: 100%; box-sizing: border-box;"></div>
                        <h4 style="margin: 10px 0; color: ${colors.text}; font-size: 13px;">添加失败：</h4>
                        <div class="chitanda_character_not_found" style="min-height:30px; margin-bottom: 10px;"></div>
                        <h4 style="margin: 10px 0; color: ${colors.text}; font-size: 13px;">从条目获取角色</h4>
                        <div style="margin: 5px 0; padding: 5px; background: ${colors.inputBg}; display: flex; flex-direction: column; gap: 5px; border-radius: 4px; flex-shrink: 0; width: 100%; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap; width: 100%;">
                                <select id="ctd_wiki_search_type_modal" style="padding: 3px; min-width: 80px; font-size: 12px; flex-shrink: 0;">
                                <option value="id">通过ID搜索</option>
                                <option value="name" selected>通过名称搜索</option>
                            </select>
                                <input type="text" id="ctd_wiki_related_subject_id_modal" placeholder="输入条目ID或名称" style="padding: 3px; flex: 1; min-width: 80px; font-size: 12px; box-sizing: border-box;">
                                <input type="button" id="ctd_wiki_btn_fetch_characters_modal" class="bgm-btn-pink" value="搜索" style="padding: 3px 10px; font-size: 12px; flex-shrink: 0;">
                            </div>
                            <div style="font-size: 11px; color: ${colors.subText};">
                                <span id="ctd_wiki_fetch_status_modal"></span>
                            </div>
                        </div>
                        <div id="ctd_wiki_subject_info_modal" style="margin: 5px 0; padding: 5px; font-size: 12px; color: ${colors.subText}; flex-shrink: 0;"></div>
                        <div id="ctd_wiki_search_results_modal" style="margin: 5px 0; padding: 5px; border: 1px solid ${colors.border}; background: ${colors.bg}; max-height: 150px; overflow-y: auto; display: none; width: 100%; box-sizing: border-box; flex-shrink: 0;"></div>
                        <hr style="margin: 10px 0; border: 0; border-top: 1px solid ${colors.border}; flex-shrink: 0;">
                        <h4 style="margin: 10px 0; color: ${colors.text}; font-size: 13px; flex-shrink: 0;">显示关联条目</h4>
                        <div style="margin: 5px 0; padding: 5px; background: ${colors.inputBg}; flex-shrink: 0;">
                            <input type="button" id="ctd_wiki_btn_fetch_related_modal" class="bgm-btn-pink" value="显示关联条目" style="padding: 3px 10px; font-size: 12px;">
                            <label style="display: inline-block; margin-left: 5px; cursor: pointer;">
                                <input type="checkbox" id="ctd_wiki_deduplicate_modal" checked style="margin-right: 3px;">
                                <span style="font-size: 12px; color: ${colors.text};" title="隐藏重复角色">去重</span>
                            </label>
                            <span id="ctd_wiki_related_status_modal" style="margin-left: 5px; font-size: 11px;"></span>
                        </div>
                        <div id="ctd_wiki_related_subjects_modal" style="margin: 5px 0; max-height: 100px; overflow-y: auto; border: 1px solid ${colors.border}; padding: 10px; background: ${colors.bg};">
                            <!-- 关联条目列表将显示在这里 -->
                        </div>
                    </div>
                `;
                
                container.appendChild(relationTable);
                container.appendChild(wikiPanel);
                
                tableParent.appendChild(container);
                    
                bindModalEvents();
                
                const fetchRelatedBtn = document.getElementById('ctd_wiki_btn_fetch_related_modal');
                if (fetchRelatedBtn) {
                    fetchRelatedBtn.addEventListener('click', function() {
                        chitanda_FetchRelatedSubjectsModal();
                    });
                }
            }
            
            return true;
        }
        return false;
    }
    
    function bindModalEvents() {
        const fetchCharsBtn = document.getElementById('ctd_wiki_btn_fetch_characters_modal');
        if (fetchCharsBtn) {
            fetchCharsBtn.addEventListener('click', function() {
                const inputElement = document.getElementById('ctd_wiki_related_subject_id_modal');
                if (!inputElement) {

                    return;
                }
                var inputVal = inputElement.value.trim();
                
                if (!inputVal) {
                    alert('请输入关联条目ID或名称');
                    return;
                }
                
                var searchType = document.getElementById('ctd_wiki_search_type_modal').value;
                if (searchType === 'id') {
                    if (/^\d+$/.test(inputVal)) {
                        document.getElementById('ctd_wiki_fetch_status_modal').textContent = '正在查询...';
                        fetch('https://api.bgm.tv/v0/subjects/' + inputVal, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.id) {
                                var colors = getThemeColors();
                                var cover = data.images && data.images.small ? data.images.small : '//lain.bgm.tv/img/no_icon_subject.png';
                                if (cover && !cover.startsWith('http')) {
                                    cover = 'https:' + cover;
                                }
                                var resultsHtml = '<ul style="margin: 0; padding: 0; list-style: none;">';
                                resultsHtml += `
                                    <li style="margin: 5px 0; padding: 5px; border-bottom: 1px solid ${colors.border}; cursor: pointer;" data-id="${data.id}" data-name="${data.name}">
                                        <div style="display: flex; align-items: center;">
                                            <img src="${cover}" width="30" height="30" style="margin-right: 10px; border-radius: 4px;">
                                            <div>
                                                <div style="font-weight: bold; color: ${colors.text};">${data.name}</div>
                                                <div style="font-size: 12px; color: ${colors.subText};">${data.name_cn || ''}</div>
                                            </div>
                                        </div>
                                    </li>
                                `;
                                resultsHtml += '</ul>';
                                document.getElementById('ctd_wiki_search_results_modal').innerHTML = resultsHtml;
                                document.getElementById('ctd_wiki_search_results_modal').style.display = 'block';
                                document.getElementById('ctd_wiki_subject_info_modal').textContent = '找到 1 个匹配结果';
                                
                                const searchResults = document.getElementById('ctd_wiki_search_results_modal');
                                const resultItems = searchResults.querySelectorAll('li');
                                resultItems.forEach(function(item) {
                                    item.addEventListener('mouseover', function() {
                                        var colors = getThemeColors();
                                        this.style.background = colors.hoverBg;
                                    });
                                    item.addEventListener('mouseout', function() {
                                        this.style.background = 'transparent';
                                    });
                                    item.addEventListener('click', function() {
                                        var subjectId = this.getAttribute('data-id');
                                        var subjectName = this.getAttribute('data-name');
                                        document.getElementById('ctd_wiki_related_subject_id_modal').value = subjectName;
                                        document.getElementById('ctd_wiki_subject_info_modal').textContent = '条目名称: ' + subjectName;
                                        document.getElementById('ctd_wiki_search_results_modal').style.display = 'none';
                                        chitanda_FetchFromRelatedSubjectWithId(subjectId, subjectName);
                                    });
                                });
                            } else {
                                document.getElementById('ctd_wiki_subject_info_modal').textContent = '未找到条目信息';
                                document.getElementById('ctd_wiki_search_results_modal').style.display = 'none';
                            }
                        })
                        .catch(error => {
                            document.getElementById('ctd_wiki_subject_info_modal').textContent = '查询出错，请检查网络连接';
                            document.getElementById('ctd_wiki_search_results_modal').style.display = 'none';
                        });
                    } else {
                        alert('请输入有效的条目ID');
                        return;
                    }
                } else if (searchType === 'name') {
                    document.getElementById('ctd_wiki_fetch_status_modal').textContent = '正在搜索...';
                    
                    fetch('https://api.bgm.tv/v0/search/subjects', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        body: JSON.stringify({
                            keyword: inputVal,
                            filter: {
                                type: null,
                                nsfw: true
                            },
                            page: 1,
                            limit: 10
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.data && data.data.length > 0) {
                            var colors = getThemeColors();
                            var resultsHtml = '<ul style="margin: 0; padding: 0; list-style: none;">';
                            data.data.forEach(function(item) {
                                var cover = item.images && item.images.small ? item.images.small : '//lain.bgm.tv/img/no_icon_subject.png';
                                if (cover && !cover.startsWith('http')) {
                                    cover = 'https:' + cover;
                                }
                                resultsHtml += `
                                    <li style="margin: 5px 0; padding: 5px; border-bottom: 1px solid ${colors.border}; cursor: pointer;" data-id="${item.id}" data-name="${item.name}">
                                        <div style="display: flex; align-items: center;">
                                            <img src="${cover}" width="30" height="30" style="margin-right: 10px; border-radius: 4px;">
                                            <div>
                                                <div style="font-weight: bold; color: ${colors.text};">${item.name}</div>
                                                <div style="font-size: 12px; color: ${colors.subText};">${item.name_cn || ''}</div>
                                            </div>
                                        </div>
                                    </li>
                                `;
                            });
                            resultsHtml += '</ul>';
                            document.getElementById('ctd_wiki_search_results_modal').innerHTML = resultsHtml;
                            document.getElementById('ctd_wiki_search_results_modal').style.display = 'block';
                            document.getElementById('ctd_wiki_subject_info_modal').textContent = '找到 ' + data.data.length + ' 个匹配结果';
                            
                            const searchResults = document.getElementById('ctd_wiki_search_results_modal');
                            const resultItems = searchResults.querySelectorAll('li');
                            resultItems.forEach(function(item) {
                                item.addEventListener('mouseover', function() {
                                    var colors = getThemeColors();
                                    this.style.background = colors.hoverBg;
                                });
                                item.addEventListener('mouseout', function() {
                                    this.style.background = 'transparent';
                                });
                                item.addEventListener('click', function() {
                                    var subjectId = this.getAttribute('data-id');
                                    var subjectName = this.getAttribute('data-name');
                                    document.getElementById('ctd_wiki_related_subject_id_modal').value = subjectName;
                                    document.getElementById('ctd_wiki_subject_info_modal').textContent = '条目名称: ' + subjectName;
                                    document.getElementById('ctd_wiki_search_results_modal').style.display = 'none';
                                    chitanda_FetchFromRelatedSubjectWithId(subjectId, subjectName);
                                });
                            });
                        } else {
                            document.getElementById('ctd_wiki_subject_info_modal').textContent = '未找到匹配的条目';
                            document.getElementById('ctd_wiki_search_results_modal').style.display = 'none';
                        }
                    })
                    。catch(error => {
                        document.getElementById('ctd_wiki_subject_info_modal').textContent = '搜索出错，请检查网络连接';
                        document.getElementById('ctd_wiki_search_results_modal').style.display = 'none';
                    });
                }
            });
        }
        

        
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#ctd_wiki_related_subject_id_modal, #ctd_wiki_search_results_modal')) {
                const searchResults = document.getElementById('ctd_wiki_search_results_modal');
                if (searchResults) {
                    searchResults.style.display = 'none';
                }
            }
        });
    }
    
    function listenToRoleCVButton() {
        const roleCVButton = document.querySelector('.modifyTool span.tip_i p:nth-child(2) a.l[style*="color: rgb(240, 145, 153);"]');
        if (roleCVButton) {

            roleCVButton.addEventListener('click', function() {

                setTimeout(function() {
                    adaptToBangumiBatchPanel();
                }, 1000);
            });
        }
    }
    
    setTimeout(adaptToBangumiBatchPanel, 1000);
    
    listenToRoleCVButton();
    
    setInterval(function() {
        const roleCVButton = document.querySelector('.modifyTool span.tip_i p:nth-child(2) a.l[style*="color: rgb(240, 145, 153);"]');
        if (roleCVButton && !roleCVButton.hasAttribute('data-listened')) {
            roleCVButton.setAttribute('data-listened', 'true');

            roleCVButton.addEventListener('click', function() {

                setTimeout(function() {
                    adaptToBangumiBatchPanel();
                }, 1000);
            });
        }
    }, 2000);

});
