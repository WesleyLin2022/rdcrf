/**
 * 封裝配置與狀態
 */
const AppState = {
    nowYear: new Date().getFullYear(),
    nowMonth: new Date().getMonth() + 1,
    get monthOpt() {
        return (this.nowMonth >= 4 && this.nowMonth <= 8) ? '年中' : '年底';
    },
    dataExist: false,
    userId: () => $('#userId').text().trim(),
	messageModalInstance: null
};

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    initializeSelect2();
    setupEventListeners();
});

function initializeSelect2() {
    $('#evaluationType').select2({
        placeholder: '請選擇評核類型',
        allowClear: true
    });
}

function setupEventListeners() {
    document.getElementById('evaluationForm').addEventListener('submit', handleSubmit);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('excelFile').addEventListener('change', handleFileSelect);
}

// 通用的 API 請求封裝
async function apiRequest(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw new Error('系統錯誤，請稍後再試');
    }
}

/**
 * 清理字串工具
 */
function cleanInput(value) {
    if (!value) return '';
    return String(value)
        .replace(/[\r\n\t]/g, '') // 去除換行
        .replace(/[｜│|]/g, '')  // 去除置中符號
        .replace(/\s{2,}/g, ' ') // 多個空白改成一個
        .trim();  // 移除首尾空白（中間空白保留）
}

/**
 * 核心：處理 Excel 資料邏輯 (抽離出來避免重複)
 */
async function processExcelData(fileObject) {
    // 檢查 fileObject 是否為 Blob/File 類型
	if (!(fileObject instanceof Blob)) {
		console.error("傳入的不是有效的檔案物件", fileObject);
		throw new TypeError("參數必須是檔案物件 (Blob/File)");
	}
	
	// 1. 取得提交按鈕 (假設 ID 是 submitBtn，請根據 HTML 調整)
    const submitBtn = document.querySelector('#evaluationForm button[type="submit"]');
    
    // 2. 進入處理狀態：禁用按鈕並顯示讀取中文字
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '處理中...';
    }
	
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target.result;
                const wb = XLSX.read(data, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

                if (!checkDataFormat(json)) {
					// 這裡很重要！如果不 resolve，await 就會卡在這裡
					resolve(false);
					if (submitBtn) submitBtn.disabled = false; // 這裡也要恢復按鈕
					return;
				}

                const validData = json.slice(1, 10);
                
                // 使用 for...of 確保非同步請求順序執行，或使用 Promise.all 併行
                for (const row of validData) {
                    const trimmedRow = row.slice(0, 5);
					// 檢查是否有「項目要點」(第二欄)
					const itemValue = trimmedRow[1] ? String(trimmedRow[1]).trim() : '';
					// 只有當項目要點不是空的時候才上傳
					if (itemValue !== '') {
						await uploadRowData(trimmedRow);
					} else {
						console.warn("跳過空項目列:", trimmedRow[0]);
					}
                    
                }
                
                showMessage('上傳成功');
                // 使用 setTimeout 讓瀏覽器先處理完 Modal 關閉與按鈕恢復的渲染
                setTimeout(() => {
                    loadCurrentEvaluationList(AppState.userId());
                }, 100);
                $('#excelFile').val('');
                resolve(true);
            } catch (err) {
				showMessage('上傳過程中發生錯誤');
                reject(err);
            } finally {
				// 3. 無論成功或失敗，最後都要恢復按鈕狀態
				if (submitBtn) {
					submitBtn.disabled = false;
					submitBtn.textContent = '確認新增'; 
				}
			}
        };
        reader.onerror = () => reject(new Error("檔案讀取失敗"));
        reader.readAsBinaryString(fileObject);
    });
}

/**
 * 單筆 Row 資料轉換與上傳
 */
async function uploadRowData(row) {
    const cleaned = row.map(cell => cleanInput(cell));
    // 這裡解構時，確保給予預設值 ''
    const [rawType, item = '', con1 = '', con2 = '', con3 = ''] = cleaned;

    // 類型轉換
    const typeMap = ['日常工作項目', 'AI的工作項目', '加分工作項目'];
    const type = typeMap.find(t => rawType.startsWith(t));

    if (!type) {
        console.warn(`無效類型: ${rawType}`);
        return;
    }

    const contributions = [con1, con2, con3];
    const payload = {
        id: AppState.userId(),
        type,
        item,
        con1: con1 || '',
        con2: con2 || '',
        con3: con3 || '',
        score: contributions.filter(c => c).length,
        comm1: con1 ? "1" : "0",
        comm2: con2 ? "1" : "0",
        comm3: con3 ? "1" : "0",
        year: AppState.nowYear,
        month: AppState.monthOpt
    };

    return apiRequest('/performance/addkpi', payload);
}

/**
 * 表單提交主控
 */
async function handleSubmit(e) {
    e.preventDefault();

    const evaluationType = cleanInput($('#evaluationType').val());
    const itemPoint = cleanInput($('#itemPoint').val());
    const desc1 = cleanInput($('#description1').val());
    const desc2 = cleanInput($('#description2').val());
    const desc3 = cleanInput($('#description3').val());
    const hasTableInputs = !!(evaluationType || itemPoint || desc1); // 強制轉布林
    const fileInput = $('#excelFile')[0];
    const hasFile = fileInput.files.length > 0;
    // *** 關鍵修正：在這裡就先取得 File 物件 ***
    const selectedFile = fileInput.files.length > 0 ? fileInput.files[0] : null;

    // 定義統一的上傳邏輯 (避免重複寫兩次)
    const executeUpload = async () => {
        const submitBtn = document.querySelector('#evaluationForm button[type="submit"]');
        try {
            // 檢查傳進來的變數是否有效
            if (!selectedFile) {
                showMessage("請重新選擇 Excel 檔案");
                return;
            }
            //console.log("開始執行 executeUpload...");
            if (submitBtn) submitBtn.disabled = true;
			if (AppState.dataExist) {
                //console.log("偵測到舊資料，正在刪除...");
                await apiRequest('/performance/deleteKPIbyIdAndTime', {
                    id: AppState.userId(),
                    year: AppState.nowYear,
                    month: AppState.monthOpt
                });
            }
            //console.log("準備進入 processExcelData...");
            // 使用鎖定住的 selectedFile
            await processExcelData(selectedFile);
            AppState.dataExist = true;
        }catch (error) {
            console.error("執行過程中出錯:", error);
            showMessage("系統執行出錯" + error.message);
        } finally {
            // 強制移除可能殘留的反灰遮罩 (萬一 Modal 卡住)
            $('.modal').modal('hide');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css({
                'overflow': '',
                'padding-right': ''
			});
			
            if (submitBtn) {
                submitBtn.disabled = false;
            }
            // 重置檔案選取器，讓使用者可以重複選同一個檔案
            $('#excelFile').val('');
        }
	};
		
    // 1. Excel 模式
    //if (!hasTableInputs && fileInput.files.length > 0) {
    if (selectedFile && !hasTableInputs) {
		//console.log("進入 Excel 模式, dataExist =", AppState.dataExist);

        // 定義一個內部函式，專門負責「關閉 Modal 並執行」
        const handleConfirmAndUpload = async () => {
            // 取得 Modal 實例並隱藏
            const modalElem = document.getElementById('confirmModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElem);
            if (modalInstance) modalInstance.hide();

            // 暴力清理背景（確保萬無一失）
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css({'overflow': '', 'padding-right': ''});

            // 執行上傳
            await executeUpload();
        };
		if (AppState.dataExist) {
            // --- 情況 A：資料已存在，顯示確認視窗 ---
            const modalElem = document.getElementById('confirmModal');
            const confirmModal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
            
            // 先清除舊的點擊事件，再綁定新的（只綁定一次）
            $("#btnYes").off("click").one("click", handleConfirmAndUpload);
            
            confirmModal.show();
        } else {
            await executeUpload();
        }
        
    } 
    // 2. 手動輸入模式
    else if (hasTableInputs) {
        console.log("進入手動輸入模式");
        if (!evaluationType || !itemPoint || !desc1) {
            showMessage('請填寫必填欄位 (類型、要點、描述1)');
            return;
        }
		// 1. 取得提交按鈕 (假設 ID 是 submitBtn，請根據 HTML 調整)
        const submitBtn = document.querySelector('#evaluationForm button[type="submit"]');
        
        // 2. 進入處理狀態：禁用按鈕並顯示讀取中文字
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        try {
            const descs = [desc1, desc2, desc3];
            const payload = {
                type: evaluationType,
                item: itemPoint,
                con1: desc1,
                con2: desc2,
                con3: desc3,
                score: descs.filter(d => d).length,
                comm1: desc1 ? "1" : "0",
                comm2: desc2 ? "1" : "0",
                comm3: desc3 ? "1" : "0"
            };
            
            await submitSingle(payload);
        } catch (error) {
            // 如果 submitSingle 內部沒有處理 showMessage，這裡可以補
            console.error("提交失敗:", error);
        } finally {
            // 無論成功或失敗，一定會執行這裡恢復按鈕
            if (submitBtn) {
                submitBtn.disabled = false;
                // submitBtn.textContent = '提交評核'; 
            }
        }
    } else {
        showMessage('請輸入表格或匯入 Excel 檔案');
    }
}

async function submitSingle(data) {
    const payload = Object.assign({ 
        id: AppState.userId(), // 補上括號
        year: AppState.nowYear, 
        month: AppState.monthOpt 
    }, data);

    try {
        const result = await apiRequest('/performance/addkpi', payload);
        // 清理 UI 邏輯
        document.getElementById('evaluationForm').reset();
        $('#evaluationType').val('').trigger('change');
        
        if (result.status == 0) {
            loadCurrentEvaluationList(AppState.userId());
        } else {
            showMessage(result.message || '儲存失敗')
        }
    } catch (error) {
		console.error("Submit Error:", error);
        showMessage(typeof error === 'string' ? error : '系統錯誤，請稍後再試');
    }
}


async function loadCurrentEvaluationList(userID) {
    const formData = {
        id: userID,
        year: AppState.nowYear,
        month: AppState.monthOpt
    };
    try {
        const data = await apiRequest('/performance/searchKPIbyIDYYMM', formData);
        if (data.status == 0) {
            displayEvaluationList(data.evaluations);
        }
    } catch (error) {
        showMessage('載入列表失敗');
    }
}

function handleFileSelect(e) {
	
    const file = e.target.files[0];
    if (!file) {
		showMessage('請選擇檔案');
		return;
	}
	

    const reader = new FileReader();
    reader.onload = function(e) { //callback function when reader complete reading job
        const data = new Uint8Array(e.target.result);    //e.target.result is array type
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet_KPI = workbook.Sheets[workbook.SheetNames[0]];  // get first worksheet
		
        
        if (!worksheet_KPI) {
            showMessage('找不到 KPI 工作表');
            return;
        }

        const KPI_jsonData = XLSX.utils.sheet_to_json(worksheet_KPI, {
            header: 1,
            defval: '',
            blankrows: false
        });
		//console.log(`KPI_jsonData = ${KPI_jsonData}`);
		
		if (!checkDataFormat(KPI_jsonData)) {
			e.target.files = null;
			$('#excelFile').val('');
			return;
		}
    };
    reader.readAsArrayBuffer(file);
}

// #### Enhanced checkDataFormat ####
function checkDataFormat(jsonData) {
	console.log("正在檢查格式...", jsonData)
    // ---------- 基本檢查 ----------
    if (!jsonData || jsonData.length < 2) {
        showMessage('工作表無資料');
        return false;
    }

    // ---------- 標頭檢查 ----------
    const headers = jsonData[0].map(h => String(h || '').trim());
    const expected = ['論功行賞', '項目要點', '具體貢獻簡述1', '具體貢獻簡述2', '具體貢獻簡述3'];

    // 只檢查前 expected.length 欄是否正確
    for (let i = 0; i < expected.length; i++) {
        const headerName = headers[i] || '';
        if (headerName !== expected[i]) {
            showMessage(`第 ${i + 1} 欄標頭名稱錯誤，應為「${expected[i]}」，實際為「${headerName || '（空白）'}」`);
            return false;
        }
    }

    // ---------- 預期的第一欄內容 ----------
    const expectedTypes = [
        '日常工作項目1', '日常工作項目2', '日常工作項目3',
        'AI的工作項目1', 'AI的工作項目2', 'AI的工作項目3',
        '加分工作項目1', '加分工作項目2', '加分工作項目3'
    ];

    // ---------- 實際資料行 ----------
    const dataRows = jsonData.slice(1);
	
	// 僅檢查前 expectedTypes.length 筆資料
    const rowsToCheck = dataRows.slice(0, expectedTypes.length);

    // ---------- 每列資料檢查 ----------
    for (let i = 0; i < rowsToCheck.length; i++) {
        const rowIndex = i + 2; // Excel 行數（加上標頭列）
        const row = rowsToCheck[i].map(cell =>
            typeof cell === 'string'
                ? cell.replace(/\s+/g, '').replace(/\n/g, '') // 去除空白、換行、置中格式
                : (cell || '')
        );

        const [rawType, itemPoint, con1, con2, con3] = row;

        // 檢查第一欄名稱
        if (rawType !== expectedTypes[i]) {
            showMessage(`第 ${rowIndex} 列第一欄錯誤，應為「${expectedTypes[i]}」，實際為「${rawType || '（空白）'}」`);
            return false;
        }

        // 檢查若第二欄為空，則後面三欄也應為空
        if (!itemPoint && (con1 || con2 || con3)) {
            showMessage(`第 ${rowIndex} 列第二欄為空，但後面有填資料，請確認`);
            return false;
        }

        // 若第二欄有資料但第一筆具體貢獻簡述1為空，應報錯
        if (itemPoint && !con1) {
            showMessage(`第 ${rowIndex} 列具體貢獻簡述1為必填，請重新確認`);
            return false;
        }
    }

    return true;
}

function SortByName(data, key){
	//排序從後端資料庫來的KPI陣列,排序為 日常工作項目->AI工作項目->加分工作項目
	const order = { "日常工作項目": 0, "AI的工作項目": 1, "加分工作項目": 2 };
	return data.sort((a, b) => {
		return order[a[key]] - order[b[key]];
	});
}

function displayEvaluationList(evaluations) {
	//顯示從後端來的KPI項目於表格中
	//console.log(evaluations);
	if (evaluations.length != 0) {
        AppState.dataExist = true;
    }
	else {
		AppState.dataExist = false;
	}
	    
    const tbody = document.getElementById('evaluationList');
    tbody.innerHTML = '';
	
	const sortedEvaluations = SortByName(evaluations, "type");
    

    sortedEvaluations.forEach(evaluation => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${evaluation.type}</td>
            <td class="content" data-field="itemPoint">${evaluation.item}</td>
            <td class="content" data-field="description1">${evaluation.contribution1}</td>
            <td class="content" data-field="description2">${evaluation.contribution2}</td>
            <td class="content" data-field="description3">${evaluation.contribution3}</td>
            <td>
                <button class="btn btn-sm btn-primary me-2" onclick="handleEdit(this, ${evaluation.serial_number})">修改</button>
                <button class="btn btn-sm btn-danger" onclick="handleDelete(${evaluation.serial_number})">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    // 渲染結束後，手動觸發 resize 事件，強迫瀏覽器重新計算卷軸
    window.dispatchEvent(new Event('resize'));
}

async function handleEdit(button, SN) {
    const row = button.closest('tr');
    const isEditing = button.textContent === '確定';

    // 模式 1: 儲存編輯 (提交)
    if (isEditing) {
        // 1. 取得並清理資料
        const con1 = cleanInput(row.querySelector('[data-field="description1"] input').value);
        const con2 = cleanInput(row.querySelector('[data-field="description2"] input').value);
        const con3 = cleanInput(row.querySelector('[data-field="description3"] input').value);
        
        const score = [con1, con2, con3].filter(c => c !== "").length; //判斷若欄位內容為不空則加1

        const formData = {
            serial_number: SN,
            item: row.querySelector('[data-field="itemPoint"] input').value,
            con1: con1,
            con2: con2,
            con3: con3,
            score: score
        };

        // 2. 發送請求
        try {
            const data = await apiRequest('/performance/updateKPIbySN', formData);
            
            if (data.status === 0) {
                // 重新載入列表
                loadCurrentEvaluationList(AppState.userId());
            } else {
                showMessage(data.message || '修改失敗');
            }
        } catch (error) {
            showMessage('系統錯誤，請稍後再試');
        }
    } 
    // 模式 2: 進入編輯模式
    else {
        row.querySelectorAll('.content').forEach(cell => {
            const field = cell.dataset.field;
            const value = cell.textContent;
            cell.innerHTML = `<input type="text" class="form-control" value="${value}">`;
        });
        button.textContent = '確定';
    }
}

async function handleDelete(SN) {
    if (!confirm('確定要刪除此評核項目嗎？')) return;
    
    try {
        const data = await apiRequest('/performance/deleteKPIbySN', { serial_number: SN });
        
        if (data.status === 0) {
            // 成功後更新畫面
            loadCurrentEvaluationList(AppState.userId());
        } else {
            showMessage(data.message || '刪除失敗');
        }
    } catch (error) {
        showMessage('系統錯誤，請稍後再試');
    }
}


function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
	window.location.href = '/login.html';
}

function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
    } else {
        fetch('/member/checkId', {
            headers: { 'Authorization': token }
        })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
				//console.log(`get user id is ${data.user.id}`);
                document.getElementById('userId').textContent = `${data.user.id}`;
				loadCurrentEvaluationList(data.user.id);
			    
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        });
    }
}

function showMessage(message) {
	const modalElement = document.getElementById('confirmModal');
	// 檢查 HTML 元素是否存在
    if (!modalElement) {
        console.error("找不到 ID 為 confirmModal 的 HTML 元素，請檢查 HTML 結構。");
        alert(message); // 備案：如果 Modal 不存在，至少用 alert 顯示
        return;
    }

    // 確保只初始化一次實例
    if (! AppState.messageModalInstance) {
        AppState.messageModalInstance = new bootstrap.Modal(modalElement);
    }

    document.getElementById('confirmModal').textContent = message;
    AppState.messageModalInstance.show();
}