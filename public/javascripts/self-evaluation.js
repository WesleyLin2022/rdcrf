document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    initializeSelect2();
    setupEventListeners();
	
});

let now_year = new Date().getFullYear();
let now_month = new Date().getMonth() + 1;
let month_opt = "";
if (now_month >= 4 && now_month <=8 ) {
	month_opt = '年中';
}
else {
	month_opt = '年底';
}

let data_exist = false;


function initializeSelect2() {
    $('#evaluationType').select2({
        placeholder: '請選擇評核類型',
        allowClear: true
    });
}

function setupEventListeners() {
    document.getElementById('evaluationForm').addEventListener('submit', handleSubmit);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
	// 處理檔案上傳
    document.getElementById('excelFile').addEventListener('change', handleFileSelect);
}

function cleanInput(value) {
    if (!value) return '';
    return value
        .replace(/[\r\n\t]/g, '')   // 去除換行
        .replace(/[｜│|]/g, '')   // 去除置中符號
		.replace(/\s{2,}/g, ' ')     // 多個空白改成一個
        .trim();                  // 移除首尾空白（中間空白保留）
}

function deleteKPIbyTimeAndId() {
	// ---------- 組合送出的資料 ----------
    const formData = {
        id: $('#userId').text().trim(),
        year: now_year,
        month: month_opt
    };

    // ---------- 送出至後端 ----------
    fetch('/performance/deleteKPIbyIdAndTime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json(); // 如果有回 JSON
    })
    .then(() => {
        document.getElementById('evaluationForm').reset();
    })
    .catch(() => {
        console.error(err);
        showMessage('系統錯誤，請稍後再試');
    });
}

async function handleSubmit(e) {
    e.preventDefault();
      

    const evaluationType = cleanInput($('#evaluationType').val());
    const itemPoint = cleanInput($('#itemPoint').val());
    const desc1 = cleanInput($('#description1').val());
    const desc2 = cleanInput($('#description2').val());
    const desc3 = cleanInput($('#description3').val());

    const hasTableInputs = evaluationType || itemPoint || desc1 || desc2 || desc3;
    const fileInput = $('#excelFile')[0];

    // 核心處理邏輯 (封裝成 async 函式)
    const processExcel = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const data = e.target.result;
                    const wb = XLSX.read(data, { type: 'binary' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

                    if (!checkDataFormat(json)) {
                        $('#excelFile').val('');
                        return resolve();
                    }

                    const validData = json.slice(1, 10);
                    const filtered = validData.filter(row => {
                        const trimmed = row.slice(0, 5);
                        return trimmed.some(cell => cell && String(cell).trim() !== '');
                    });

                    // --- 關鍵：將所有 row 轉換成 Promise 陣列並等待全部完成 ---
                    const promises = filtered.map(row => submitRow(row.slice(0, 5)));
                    await Promise.all(promises);

                    // 全部完成後執行更新
                    showMessage(`上傳成功`);
                    loadCurrentEvaluationList($('#userId').text());
                    $('#excelFile').val('');
                    document.getElementById('evaluationForm').reset();
                    $('#evaluationType').val('').trigger('change');
                    
                    resolve();
                } catch (err) {
                    console.error(err);
                    showMessage('上傳過程中發生錯誤');
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    // 匯入 Excel 模式邏輯
    if (!hasTableInputs && fileInput.files.length > 0) {
        if (data_exist) {
            $("#confirmModal").modal('show');
            $("#btnYes").off("click").on("click", async function () {
                $("#confirmModal").modal('hide');
                deleteKPIbyTimeAndId(); // 建議此函數也改為 Promise/await 以確保先刪除完畢
                await processExcel(fileInput.files[0]);
            });

            $("#btnNo").off("click").on("click", function () {
                $("#confirmModal").modal('hide');
                $('#excelFile').val('');
            });
        } else {
            await processExcel(fileInput.files[0]);
        }
    }
	// ==========================================================
    // 手動輸入模式
    // ==========================================================
    else if (hasTableInputs) {
        // 驗證欄位
        if (!evaluationType) {
            showMessage('請選擇評核類型');
            return;
        }
        if (!itemPoint) {
            showMessage('項目要點為必填');
            return;
        }
        if (!desc1) {
            showMessage('具體貢獻描述1為必填');
            return;
        }

        // 自動計算分數（填幾個描述就幾分）
        let score_counter = 0;
		let con1_value = "0";
	    let con2_value = "0";
	    let con3_value = "0";
        if (desc1) {
			score_counter++;
			con1_value = "1";
		}
        if (desc2) {
			score_counter++;
			con2_value = "1";
		}
        if (desc3) {
			score_counter++;
			con3_value = "1";
		}

        // 組合資料（確保乾淨無空白）
        const payload = {
            type: evaluationType,
            item: itemPoint,
            con1: desc1,
            con2: desc2,
            con3: desc3,
            score: score_counter,
            comm1: con1_value,
            comm2: con2_value,
            comm3: con3_value
        };

        // 呼叫單筆提交函式
        submitSingle(payload);
        return;
    }

    // ==========================================================
    // 無輸入或上傳
    // ==========================================================
    else {
        showMessage('請輸入表格或匯入 Excel 檔案');
    }
}

function handleSubmit__old(e) {
	//防止瀏覽器在提交表單時刷新頁面。
    e.preventDefault();
    
    // ---------- 清理前端輸入欄位 ----------

    const evaluationType = cleanInput($('#evaluationType').val());
    const itemPoint = cleanInput($('#itemPoint').val());
    const desc1 = cleanInput($('#description1').val());
    const desc2 = cleanInput($('#description2').val());
    const desc3 = cleanInput($('#description3').val());

    const hasTableInputs = evaluationType || itemPoint || desc1 || desc2 || desc3;
    const fileInput = $('#excelFile')[0];
	
	

    // ==========================================================
    // 匯入 Excel 模式
    // ==========================================================
    if (!hasTableInputs && fileInput.files.length > 0) {
		
		// 如果存在舊資料
		if (data_exist) {
			// 確認是否要覆蓋舊檔案
			
			// 觸發 Modal
			$("#confirmModal").modal('show');
			
			// 先移除舊事件，再綁定一次
			$("#btnYes").off("click").on("click", function () {
				console.log("執行處理");
				
				$("#confirmModal").modal('hide');
				
				// 先刪除舊有資料
				deleteKPIbyTimeAndId();
				// 再執行動作
				const file = fileInput.files[0];
				const reader = new FileReader();
				reader.onload = function (e) {
					const data = e.target.result;
					const wb = XLSX.read(data, { type: 'binary' });
					const ws = wb.Sheets[wb.SheetNames[0]];
					const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

					// 檢查格式是否正確
					if (!checkDataFormat(json)) {
						$('#excelFile').val('');
						return;
					}
					
					// 僅取出前 9 列資料（忽略多餘資料列）
					const validData = json.slice(1, 10); // 第1列是標頭，最多取到第9列
					
					const filtered = validData.filter(row => {
                        // 只取前5欄資料（忽略多餘欄位）
                        const trimmed = row.slice(0,5);
                        return trimmed.some(cell => cell && cell.trim && cell.trim() !== '');
                    });

                    filtered.forEach((row, i) => {
                        const isLast = i === filtered.length - 1;
                        submitRow(row.slice(0,5), isLast);
                    });
					

					showMessage(`上傳成功`);
					loadCurrentEvaluationList($('#userId').text());
					$('#excelFile').val('');
				};

				reader.readAsBinaryString(file);
				return;
				
			});

			//  btnNo 同樣也要清理事件，再綁定一次
			$("#btnNo").off("click").on("click", function () {
				//console.log("取消處理");
				$("#confirmModal").modal('hide');
				$('#excelFile').val('');
				return;
			});
		} //end of if (data_exist)
        else {
			//console.log("no data exist");
			
			const file = fileInput.files[0];
			const reader = new FileReader();
			reader.onload = function (e) {
				const data = e.target.result;
				const wb = XLSX.read(data, { type: 'binary' });
				const ws = wb.Sheets[wb.SheetNames[0]];
				const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

				// 檢查格式是否正確
				if (!checkDataFormat(json)) {
					$('#excelFile').val('');
					return;
				}
				
				// 僅取出前 9 列資料（忽略多餘資料列）
				const validData = json.slice(1, 10); // 第1列是標頭，最多取到第9列
				
                const filtered = validData.filter(row => {
                    const trimmed = row.slice(0,5);
                    return trimmed.some(cell => cell && cell.trim && cell.trim() !== '');
                });

                filtered.forEach((row, i) => {
                    const isLast = i === filtered.length - 1;
                    submitRow(row.slice(0,5), isLast);
                });
				

				showMessage(`上傳成功`);
				loadCurrentEvaluationList($('#userId').text());
				$('#excelFile').val('');
			};

			reader.readAsBinaryString(file);
			return;
		} //end of if (!data_exit)			
        
    }

    // ==========================================================
    // 手動輸入模式
    // ==========================================================
    else if (hasTableInputs) {
        // 驗證欄位
        if (!evaluationType) {
            showMessage('請選擇評核類型');
            return;
        }
        if (!itemPoint) {
            showMessage('項目要點為必填');
            return;
        }
        if (!desc1) {
            showMessage('具體貢獻描述1為必填');
            return;
        }

        // 自動計算分數（填幾個描述就幾分）
        let score_counter = 0;
		let con1_value = "0";
	    let con2_value = "0";
	    let con3_value = "0";
        if (desc1) {
			score_counter++;
			con1_value = "1";
		}
        if (desc2) {
			score_counter++;
			con2_value = "1";
		}
        if (desc3) {
			score_counter++;
			con3_value = "1";
		}

        // 組合資料（確保乾淨無空白）
        const payload = {
            type: evaluationType,
            item: itemPoint,
            con1: desc1,
            con2: desc2,
            con3: desc3,
            score: score_counter,
            comm1: con1_value,
            comm2: con2_value,
            comm3: con3_value
        };

        // 呼叫單筆提交函式
        submitSingle(payload);
        return;
    }

    // ==========================================================
    // 無輸入或上傳
    // ==========================================================
    else {
        showMessage('請輸入表格或匯入 Excel 檔案');
    }
}

function submitRow(row) {
    // ---------- 清理空白與換行 ----------
    const cleaned = row.map(cell =>
        typeof cell === 'string'
            ? cell.replace(/\n/g, '').replace(/　/g, '').trim()
            : (cell || '')
    );

    const [rawType, item, con1, con2, con3] = cleaned;
    let con1_value = "0", con2_value = "0", con3_value = "0";

    let type = '';
    if (/^日常工作項目/.test(rawType)) { type = '日常工作項目'; }
    else if (/^AI的工作項目/.test(rawType)) { type = 'AI的工作項目'; }
    else if (/^加分工作項目/.test(rawType)) { type = '加分工作項目'; }
    else {
        showMessage(`無效的論功行賞類型：「${rawType}」`);
        return Promise.reject('Invalid Type'); // 回傳失敗以利捕捉
    }

    let score_counter = 0;
    if (con1) { score_counter++; con1_value = "1"; }
    if (con2) { score_counter++; con2_value = "1"; }
    if (con3) { score_counter++; con3_value = "1"; }

    const formData = {
        id: $('#userId').text().trim(),
        type, item,
        con1: con1 || '', con2: con2 || '', con3: con3 || '',
        score: score_counter,
        comm1: con1_value, comm2: con2_value, comm3: con3_value,
        year: now_year,
        month: month_opt
    };

    // --- 關鍵：回傳 fetch 的 Promise ---
    return fetch('/performance/addkpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
    });
}

function submitRow_old(row, update_flag) {
    // ---------- 清理空白與換行 ----------
    const cleaned = row.map(cell =>
        typeof cell === 'string'
            ? cell
                .replace(/\n/g, '')       // 去除換行符號
                .replace(/　/g, '')        // 去除全形空白（置中符號）
                .trim()                    // 去除頭尾空白
            : (cell || '')
    );


    // 解構清理後的欄位
    const [rawType, item, con1, con2, con3] = cleaned;
	let con1_value = "0";
	let con2_value = "0";
	let con3_value = "0";

    // ---------- 將「論功行賞」轉換為標準類型 ----------
    let type = '';
    if (/^日常工作項目/.test(rawType)) {
        type = '日常工作項目';
    } else if (/^AI的工作項目/.test(rawType)) {
        type = 'AI的工作項目';
    } else if (/^加分工作項目/.test(rawType)) {
        type = '加分工作項目';
    } else {
        showMessage(`無效的論功行賞類型：「${rawType}」`);
        return;
    }

    // ---------- 自動計算分數 & 設定flag ----------
    let score_counter = 0;
    if (con1) {
		score_counter++;
		con1_value = "1";
	}
    if (con2) {
		score_counter++;
		con2_value = "1";
	}
    if (con3) {
		score_counter++;
		con3_value = "1";
	}

    // ---------- 組合送出的資料 ----------
    const formData = {
        id: $('#userId').text().trim(),
        type,
        item,
        con1: con1 || '',
        con2: con2 || '',
        con3: con3 || '',
        score: score_counter,
		comm1: con1_value,
		comm2: con2_value,
		comm3: con3_value,
        year: now_year,
        month: month_opt
    };

    // ---------- 送出至後端 ----------
    fetch('/performance/addkpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json(); // 如果有回 JSON
    })
	.then(() => {
		if (update_flag) {
			// 最後一筆上傳完後重整列表
			document.getElementById('evaluationForm').reset();
			$('#evaluationType').val('').trigger('change');
			//loadCurrentEvaluationList($('#userId').text());
		}
	})
	.catch(() => {
		showMessage('系統錯誤，請稍後再試');
	});
}



function submitSingle(data) {
    const formData = Object.assign({ id: $('#userId').text(), year: now_year, month: month_opt }, data);
    fetch('/performance/addkpi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
	.then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json(); // 如果有回 JSON
    })
    .then(data => {
        if (data.status == 0) {
            document.getElementById('evaluationForm').reset();
			$('#evaluationType').val('').trigger('change');
			loadCurrentEvaluationList($('#userId').text());
        }
		else {
			document.getElementById('evaluationForm').reset();
			$('#evaluationType').val('').trigger('change');
			showMessage(data.message);
		}
    })
    .catch(error => {
        showMessage('系統錯誤，請稍後再試');
    });
	
}


function loadCurrentEvaluationList(userID) {
	//console.log(userID);
	//console.log(month_opt);
	const formData = {
		id:  userID,
		year: now_year,
		month: month_opt
        
    };
	fetch('/performance/searchKPIbyIDYYMM', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json(); // 如果有回 JSON
    })
    .then(data => {
        if (data.status == 0) {
            displayEvaluationList(data.evaluations);
        }
    })
    .catch(error => {
        showMessage('系統錯誤，請稍後再試');
    });
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
			$('#excelFile').val('');
			return;
		}
    };
    reader.readAsArrayBuffer(file);
}

// #### Enhanced checkDataFormat ####
function checkDataFormat(jsonData) {
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
        data_exist = true;
    }
	else {
		data_exist = false;
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
                <button class="btn btn-sm btn-danger me-2" onclick="handleDelete(${evaluation.serial_number})">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleEdit(button, SN) {
    const row = button.closest('tr');
    const isEditing = button.textContent === '確定';

    if (isEditing) {
	let score_counter = 0;
	let con1 = cleanInput(row.querySelector('[data-field="description1"] input').value);
	let con2 = cleanInput(row.querySelector('[data-field="description2"] input').value);
	let con3 = cleanInput(row.querySelector('[data-field="description3"] input').value);
        let com1_value = "0", com2_value = "0", com3_value = "0";
		if (con1.length > 0 ){
			score_counter++;
			com1_value = "1";
		}
		else {
			con1 = "";
		}
		if (con2.length > 0 ){
			score_counter++;
			com2_value = "1";
		}
		else {
			con2 = "";
		}
		if (con3.length > 0 ){
			score_counter++;
			com3_value = "1";
		}
		else {
			con3 = "";
		}
        // 保存修改
        const formData = {
            serial_number: SN,
            item: row.querySelector('[data-field="itemPoint"] input').value,
            con1: con1,
            con2: con2,
            con3: con3,
	    com1: com1_value,
	    com2: com2_value,
	    com3: com3_value,
            score: score_counter
        };

        fetch('/performance/updateKPIbySN', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error: ${res.status}`);
            }
            return res.json(); // 如果有回 JSON
        })
        .then(data => {
            if (data.status == 0) {
                loadCurrentEvaluationList(document.getElementById('userId').textContent);
				//button.textContent = '修改';
				
            } else {
                showMessage(data.message || '修改失敗');
            }
        })
        .catch(error => {
            showMessage('系統錯誤，請稍後再試');
        });
    } else {
        // 進入編輯模式
        row.querySelectorAll('.content').forEach(cell => {
            const field = cell.dataset.field;
            const value = cell.textContent;
            cell.innerHTML = `<input type="text" class="form-control" value="${value}">`;
        });
        button.textContent = '確定';
    }
}

function handleDelete(SN) {
    if (!confirm('確定要刪除此評核項目嗎？')) return;
	
	
	fetch('/performance/deleteKPIbySN', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({serial_number:  SN})
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json(); // 如果有回 JSON
    })
    .then(data => {
        if (data.status == 0) {
            loadCurrentEvaluationList(document.getElementById('userId').textContent);
        }
		else {
			showMessage(data.message || '刪除失敗');
		}
    })
    .catch(error => {
        showMessage('系統錯誤，請稍後再試');
    });
}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
	window.location.href = '/login.html';
}

function goToLogin() {
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
        //.then(res => res.json())
		.then(res => {
            if (!res.ok) {
                // 如果狀態碼不是 200-299，直接丟出錯誤
                throw new Error(`HTTP error: ${res.status}`);
            }
            return res.json(); // 如果有回 JSON
        })
        .then(data => {
            if (data.user) {
				//console.log(`get user id is ${data.user.id}`);
                document.getElementById('userId').textContent = `${data.user.id}`;
				loadCurrentEvaluationList(data.user.id);
			    
            } else {
				goToLogin();
            }
        })
        .catch(err => {
            // 這裡捕獲 throw new Error 或網路斷線
            console.error(err);
            goToLogin();
        });
    }
}

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}
