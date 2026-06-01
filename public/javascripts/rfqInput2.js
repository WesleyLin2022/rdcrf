function loadRFQInputPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="container">
            <h2>RFQ輸入</h2>
            <!-- 第一區塊 -->
            <div class="card mb-4">
                <div class="card-body">
                    <form id="rfqInputForm">
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="projectSelect" class="form-label">專案名稱</label>
                                    <select class="form-select" id="projectSelect" >
                                        <option value="">請選擇專案</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="excelFile" class="form-label">Excel檔案</label>
                                    <input type="file" class="form-control" id="excelFile" accept=".xlsx,.xls" required>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3 ">
								    <label class="form-label"></label>
                                    <button type="submit" class="btn btn-primary">確定</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            
			
            <!-- 第二區塊：Import_ANT -->
            <div class="display-section">
                <div class="card-header">
                    <h5>ANT Info.</h5>
                </div>
                <div class="table-container" >
                    <table id="excelANT" style="border-collapse: separate; width: 100%;">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <!-- 第三區塊：Import_NRE -->
            <div class="display-section">
                <div class="card-header">
                    <h5>NRE Info.</h5>
                </div>
                <div class="table-container" >
                    <table id="excelNRE" style="border-collapse: separate; width: 100%;">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <!-- 上傳按鈕 -->
            <div class="text-center mb-4">
                <button id="uploadButton" class="btn btn-success" style="display: none;">上傳資料</button>
            </div>
        </div>
    `;

    // 載入專案列表
    loadProjects();

    // 處理Excel檔案讀取
    document.getElementById('rfqInputForm').addEventListener('submit', handleExcelRead);

    // 處理資料上傳
    document.getElementById('uploadButton').addEventListener('click', handleDataUpload);
}

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        const select = document.getElementById('projectSelect');
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('載入專案失敗:', error);
        alert('載入專案列表失敗');
    }
}

async function handleExcelRead(e) {
    e.preventDefault();
	
    const file = document.getElementById('excelFile').files[0];
    if (!file) {
        alert('請選擇Excel檔案');
        return;
    }
	const reader = new FileReader();
    reader.onload = function(e) { //callback function when reader complete reading job
        const data = new Uint8Array(e.target.result); //e.target.result is array type
        const workbook = XLSX.read(data, {type: 'array'});
        const worksheet_ANT = workbook.Sheets['Import_ANT'];
		const worksheet_NRE = workbook.Sheets['Import_NRE'];
        
        if (!worksheet_ANT) {
            alert('找不到 Import_ANT 工作表');
            return;
        }
        
        if (!worksheet_NRE) {
            alert('找不到 Import_NRE 工作表');
            return;
        }
		
		processANTHyperLink(worksheet_ANT);

        const ANT_jsonData = XLSX.utils.sheet_to_json(worksheet_ANT, {
            header: 1,
            defval: '',
            blankrows: false
        });
		if (ANT_jsonData.length < 3) {
			alert('Import_ANT 無資料');
            return;
		}
        ANT_excelData = processANTlData(ANT_jsonData);
		
        
        const NRE_jsonData = XLSX.utils.sheet_to_json(worksheet_NRE, {
            header: 1,
            defval: '',
            blankrows: false
        });
		if (NRE_jsonData.length < 3) {
			alert('Import_NRE 無資料');
            return;
		}
        NRE_excelData = processNRElData(NRE_jsonData);
        
		displayANTData(ANT_excelData);
		displayNREData(NRE_excelData);
        document.getElementById('uploadButton').disabled = false;
    };
    reader.readAsArrayBuffer(file);
	/////
	/*
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', document.getElementById('projectSelect').value);
	console.log(formData)

    try {
        const response = await fetch('/member/read-excel', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            displayANTData(data.antData);
            displayNREData(data.nreData);
            document.getElementById('uploadButton').style.display = 'block';
        } else {
            alert('讀取Excel失敗');
        }
    } catch (error) {
        console.error('錯誤:', error);
        alert('發生錯誤');
    }
	*/
}


function processANTHyperLink(worksheet){
	const hyperlinks = [];
	const cellAddress = 'AH3';
    const cell = worksheet[cellAddress];

    if (cell) {
        let output = `儲存格 ${cellAddress} 的內容：\n`;
        if (cell.l) {
            output += `- 顯示的文字： ${cell.v}\n`;
			let targetUrl = cell.l.Target;
			try {
                // 嘗試將亂碼的 URL 解碼回原始中文字
                const utf8Decoder = new TextDecoder('utf-8');
				const bytes = new Uint8Array(targetUrl.split('').map(c => c.charCodeAt(0)));
				const decodedUrl = utf8Decoder.decode(bytes);
                // 如果解碼成功，就顯示解碼後的網址
                output += `- 超連結網址： ${decodedUrl}\n`;
            } catch (error) {
                // 如果 decodeURIComponent 失敗，表示 URL 沒有被編碼過
                output += `- 超連結網址 (未解碼)： ${targetUrl}\n`;
            }
            output += `- 超連結網址： ${cell.l.Target}\n`;
        } else {
            output += `- 沒有超連結，只有文字： ${cell.v}\n`;
        }

        console.log(output);
    } else {
		console.log("!!!!!!!!!!!!!!");
    }
	//console.log(hyperlinks);
}

function processANTlData(jsonData) {
	
    // 處理合併儲存格
    const headers = [...jsonData[0].slice(0, 5), ...jsonData[1].slice(5)]; //... (spread opreator)把陣列展開成各別值，因此三點後面必接一個陣列
	console.log(headers);
	merge_field_1 = jsonData[2].slice(0,6);
	merge_field_2 = jsonData[2].slice(-1);
	last_row_index = jsonData.length;
	console.log(last_row_index);
	
	const hyperlinks = [];
    const data = jsonData.slice(2).map(row => {
        return row.map((cell, index) => {
            if (index < 6) {
                return merge_field_1[index];
            }
			else if (index === row.length - 1){
				return merge_field_2[0];
			}
			else {
			    return cell;
			}
        });
    });
    return { headers, data };
}

function processNRElData(jsonData) {
	
    // 處理合併儲存格
	const headers1 = [jsonData[0][0], jsonData[0][1], jsonData[0][1], ...jsonData[0].slice(3, 6), jsonData[0][6], jsonData[0][6], jsonData[0][6], 
	                  jsonData[0][9], jsonData[0][9], jsonData[0][11], jsonData[0][12], jsonData[0][12], jsonData[0][14]];
	
    const headers2 = [...jsonData[1]]; //... (spread opreator)把陣列展開成各別值，因此三點後面必接一個陣列
	//console.log(headers2);
	
	
    const data = jsonData.slice(2)
    return { headers1, headers2, data };
}

function displayANTData({ headers, data }) {
    const thead = document.querySelector('#excelANT thead');
    const tbody = document.querySelector('#excelANT tbody');
    
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = data.map(row => 
        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');
}

function displayNREData({ headers1, headers2, data }) {
    const thead = document.querySelector('#excelNRE thead');
    const tbody = document.querySelector('#excelNRE tbody');
    
    thead.innerHTML = `<tr>${headers1.map(h => `<th>${h}</th>`).join('')}</tr><tr>${headers2.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = data.map(row => 
        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');
}

/*
function displayANTData(data) {
    const headerRow1 = document.getElementById('antHeaderRow1');
    const headerRow2 = document.getElementById('antHeaderRow2');
    const tableBody = document.getElementById('antTableBody');

    // 清空現有內容
    headerRow1.innerHTML = '';
    headerRow2.innerHTML = '';
    tableBody.innerHTML = '';

    // 設置表頭
    data.headers.forEach(header => {
        if (header.merged) {
            const th = document.createElement('th');
            th.colSpan = header.colspan;
            th.textContent = header.text;
            headerRow1.appendChild(th);
        }
    });

    // 設置第二行表頭
    data.subHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow2.appendChild(th);
    });

    // 設置資料行
    data.rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, index) => {
            const td = document.createElement('td');
            if (index === row.length - 1 && cell.isLink) {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = cell.text;
                link.onclick = () => handleFileUpload(cell.filePath);
                td.appendChild(link);
            } else {
                td.textContent = cell;
            }
            if (cell.rowspan) {
                td.rowSpan = cell.rowspan;
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

function displayNREData(data) {
    // 類似 displayANTData 的實現，但根據 NRE 表格的特定結構
    // ... 實現 NRE 資料顯示邏輯 ...
}

async function handleFileUpload(filePath) {
    // 處理檔案上傳邏輯
    // ... 實現檔案上傳邏輯 ...
}

async function handleDataUpload() {
    // 處理整體資料上傳到後端的邏輯
    // ... 實現資料上傳邏輯 ...
}
*/