document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Select2
    $('#projectId').select2({
        placeholder: '請選擇或輸入專案編號',
        allowClear: true,
        ajax: {
            url: '/project/searchProjectsId',  // 呼叫後端 API
            dataType: 'json',
            delay: 250,                       // 輸入後延遲 250ms 再發送請求
            data: function(params) {
                return {
                    search: params.term       // 傳送輸入文字作為參數 search
                };
            },
            processResults: function(data) {
                return {
                    results: data.map(results => ({
                        id: results.id,
                        text: results.id
                    }))
                };
            },
            cache: true
        }
    });

    // 檢查登入狀態
    checkLoginStatus();

    // 處理登出按鈕
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 處理檔案上傳
    document.getElementById('excelFile').addEventListener('change', handleFileSelect);

    // 處理表單提交
    document.getElementById('contentInputForm').addEventListener('submit', handleFormSubmit);
});
let ANT_excelData = null;
let NRE_excelData = null;


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
				//console.log(data.user);
                document.getElementById('userId').textContent = `${data.user.id}`;
				
			    
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        });
    }
}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
	window.location.href = '/login.html';
}

function handleFileSelect(e) { 
    const file = e.target.files[0];
    if (!file) {
		showMessage('請選擇檔案');
		return;
	}
	ANT_excelData = null;
	NRE_excelData = null;

    const reader = new FileReader();
    reader.onload = function(e) { //callback function when reader complete reading job
        const data = new Uint8Array(e.target.result);    //e.target.result is array type
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet_ANT = workbook.Sheets['Import_ANT'];
		const worksheet_NRE = workbook.Sheets['Import_NRE'];
        
        if (!worksheet_ANT) {
            showMessage('找不到 Import_ANT 工作表');
            return;
        }
        
        if (!worksheet_NRE) {
            showMessage('找不到 Import_NRE 工作表');
            return;
        }

        const ANT_jsonData = XLSX.utils.sheet_to_json(worksheet_ANT, {
            header: 1,
            defval: '',
            blankrows: false
        });
		if (ANT_jsonData.length < 3) {
			showMessage('Import_ANT 無資料');
            return;
		}
        ANT_excelData = processANTlData(ANT_jsonData);
		
        
        const NRE_jsonData = XLSX.utils.sheet_to_json(worksheet_NRE, {
            header: 1,
            defval: '',
            blankrows: false
        });
		if (NRE_jsonData.length < 3) {
			showMessage('Import_NRE 無資料');
            return;
		}
        NRE_excelData = processNRElData(NRE_jsonData);
        
		//displayANTData(ANT_excelData);
		//displayNREData(NRE_excelData);
        

        displayPreview(ANT_excelData);
		displayPreviewN(NRE_excelData);
    };
    reader.readAsArrayBuffer(file);
}

function processANTlData(jsonData) {
	
    // 處理合併儲存格
    const headers = [...jsonData[0].slice(0, 5), ...jsonData[1].slice(5)]; //... (spread opreator)把陣列展開成各別值，因此三點後面必接一個陣列
	//console.log(headers);
	merge_field_1 = jsonData[2].slice(0,6);
	merge_field_2 = jsonData[2].slice(-1);
	last_row_index = jsonData.length;
	console.log(last_row_index);
	
	
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
	//console.log(headers1);
    const headers2 = [...jsonData[1]]; //... (spread opreator)把陣列展開成各別值，因此三點後面必接一個陣列
	//console.log(headers2);
	
	
    const data = jsonData.slice(2)
    return { headers1, headers2, data };
}

function displayPreview({ headers, data }) {
    const previewHeader = document.getElementById('previewHeader');
    const previewContent = document.getElementById('previewContent');
    
    // 清空現有內容
    previewHeader.innerHTML = '';
    previewContent.innerHTML = '';

    if (data.length === 0) {
        showMessage('Excel 檔案沒有內容');
        return;
    }

    // 創建表頭
    const headerRow = document.createElement('tr');
    headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header || `欄位 ${index + 1}`;
        headerRow.appendChild(th);
    });
    previewHeader.appendChild(headerRow);

    // 創建數據行
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length === 0) continue;

        const tr = document.createElement('tr');
        row.forEach(cellData => {
            const td = document.createElement('td');
            td.textContent = cellData || '';
            td.title = cellData || ''; // 添加懸停提示
            tr.appendChild(td);
        });
        previewContent.appendChild(tr);
    }

    document.getElementById('previewTable').classList.remove('d-none');
}

function displayPreviewN({ headers1, headers2, data }) {
    const previewHeader = document.getElementById('previewHeaderN');
    const previewContent = document.getElementById('previewContentN');
    //console.log(headers1);
	//console.log(headers2);
    // 清空現有內容
    previewHeader.innerHTML = '';
    previewContent.innerHTML = '';

    if (data.length === 0) {
        showMessage('Excel 檔案沒有內容');
        return;
    }

    // 創建表頭
    const headerRow = document.createElement('tr');
    headers1.forEach((header, index) => {
        const th = document.createElement('th');
        //th.textContent = header || `欄位 ${index + 1}`;
		th.textContent = header;
        headerRow.appendChild(th);
    });
	previewHeader.appendChild(headerRow);
	
	const headerRow2 = document.createElement('tr');
	headers2.forEach((header, index) => {
        const th = document.createElement('th');
        //th.textContent = header || `欄位 ${index + 1}`;
		th.textContent = header;
        headerRow2.appendChild(th);
    });
    previewHeader.appendChild(headerRow2);

    // 創建數據行
    for (let i = 0; i < 1; i++) {
        const row = data[i];
        if (row.length === 0) continue;

        const tr = document.createElement('tr');
        row.forEach(cellData => {
            const td = document.createElement('td');
            td.textContent = cellData || '';
            td.title = cellData || ''; // 添加懸停提示
            tr.appendChild(td);
        });
        previewContent.appendChild(tr);
    }

    document.getElementById('previewTable').classList.remove('d-none');
}


/*function displayPreview(data) {
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = '';

    // 跳過標題行，從第二行開始顯示
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length === 0) continue;

        const tr = document.createElement('tr');
        for (let j = 0; j < 5; j++) {
            const td = document.createElement('td');
            td.textContent = row[j] || '';
            tr.appendChild(td);
        }
        previewContent.appendChild(tr);
    }

    document.getElementById('previewTable').classList.remove('d-none');
}*/

async function handleFormSubmit(e) {
    e.preventDefault();

    const projectId = document.getElementById('projectId').value;
    const file = document.getElementById('excelFile').files[0];

    if (!projectId || !file) {
        showMessage('請選擇專案名稱和excel檔案');
        return;
    }
	// 刪除project_data的資料
	try {
        await deleteFunction(projectId, ANT_excelData.data[0][4]);
		
    } catch (error) {
        console.error('刪除失敗:', error);
        return;
    }
	// 更新projects中的Other與Note欄位
	try {
        await updateProjectNote(projectId, ANT_excelData.data[0][34]);
		
    } catch (error) {
        console.error('刪除失敗:', error);
        return;
    }
	
	// 刪除 project_nre_cost 的資料
	try {
        await deleteNRECost(projectId);
		
    } catch (error) {
        console.error('project_nre_cost刪除失敗:', error);
        return;
    }
	// 新增project_nre_cost的資料
	try {
        await addNRECost(projectId);
		
    } catch (error) {
        console.error('新增project_nre_cost失敗:', error);
        return;
    }

	
	let error_flag = 0;
	for (let i = 0; i < ANT_excelData.data.length; i++) {
        const row = ANT_excelData.data[i];
        if (row.length === 0) continue;
		const projectData = {
			bu: row[0],
			customer: row[1],
			id: projectId,
			forecast: row[3],
			type: row[4],
			platform_type: row[5],
			Ant_environment: row[6],
			Ant_location: row[7],
			Ant_function: row[8],
			SAR: row[9],
			Ant_body: row[10],
			Ant_cable_type: row[11],
			Cable_Con: row[12],
			Ant_function_description: row[13],
			Ant_body_dimension: row[14],
			Ant_cable_length: row[15],
			Ant_grounding_size_and_AlCu_foil: row[16],
			Bracket_for_perf: row[17],
			PCB_for_cable_fix: row[18],
			conductive_fabric: row[19],
			gasket: row[20],
			teflon: row[21],
			casing: row[22],
			tape: row[23],
			mech_req: row[24],
			wnc: row[25],
			awan: row[26],
			inpaq: row[27],
			hb: row[28],
			htk: row[29],
			speed: row[30],
		    pulse: row[31],
			other: row[32]
        };
		try {
			const res = await fetch('/project/dataImport', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });
			const data = await res.json();
            if (data.status !== 0) {
                showMessage(data.message || '上傳失敗');
                error_flag = 1;
            }
			
		
		} catch (error) {
			showMessage('系統錯誤，請稍後再試');
			error_flag = 1;
			break;
		}
    }
	if (error_flag == 0) {
		showMessage('內容上傳成功');
	    document.getElementById('contentInputForm').reset();
	    document.getElementById('previewTable').classList.add('d-none');
		document.getElementById('contentInputForm').reset();
	}
	
	/*
	const projectData = {
		bu: ANT_excelData.data[],
        customer: document.getElementById('userId').textContent,
		id: document.getElementById('projectName').value,
        forecast: document.getElementById('userId').textContent,
		type: document.getElementById('projectName').value,
        platform_type: document.getElementById('userId').textContent,
		Ant_environment: document.getElementById('projectName').value,
        Ant_location: document.getElementById('userId').textContent,
		Ant_function: document.getElementById('projectName').value,
        SAR: document.getElementById('userId').textContent,
		Ant_body: document.getElementById('projectName').value,
        Ant_cable_type: document.getElementById('userId').textContent,
		Cable_Con: document.getElementById('projectName').value,
        Ant_function_description: document.getElementById('userId').textContent,
		Ant_body_dimension: document.getElementById('projectName').value,
        Ant_cable_length(mm): document.getElementById('userId').textContent,
		Ant_grounding_size_and_AlCu_foil: document.getElementById('projectName').value,
        PCB_for_cable_fix: document.getElementById('userId').textContent,
		conductive_fabric: document.getElementById('projectName').value,
        gasket: document.getElementById('userId').textContent,
		teflon: document.getElementById('projectName').value,
        casing: document.getElementById('userId').textContent,
		tape: document.getElementById('projectName').value,
        mech_req: document.getElementById('userId').textContent,
		wnc: document.getElementById('projectName').value,
        awan: document.getElementById('userId').textContent,
		inpaq: document.getElementById('projectName').value,
        hb: document.getElementById('userId').textContent,
		htk: document.getElementById('projectName').value,
        speed: document.getElementById('userId').textContent,
        pulse: document.getElementById('projectDate').value
		
    };
	try {
        fetch('/project/createProject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        })
	    .then(res => res.json())
		.then(data => {
			if (data.status == 0){
			    //alert('專案建立成功！');
				showMessage('內容上傳成功');
                document.getElementById('contentInputForm').reset();
                document.getElementById('previewTable').classList.add('d-none');
		    }
			else {
				showMessage(data.message || '上傳失敗');
			}
			
		});
	
    } catch (error) {
        showMessage('系統錯誤，請稍後再試');
    }
	*/

    
}

async function deleteFunction(id, type){
	const res = await fetch('/project/deleteExistDataInPD', {
        method: 'POST',
		headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id: id, type:type})
        
    });
    const data = await res.json();
    if (!res.ok || data.status !== 0) {
        throw new Error(data.message || '刪除失敗');
    }
}

async function updateProjectNote(id, note){
	const res = await fetch('/project/updateProjectNote', {
        method: 'POST',
		headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id: id, note:note})
        
    });
    const data = await res.json();
    if (!res.ok || data.status !== 0) {
        throw new Error(data.message || '刪除失敗');
    }
}

async function deleteNRECost(id){
	const res = await fetch('/project/deleteNRECost', {
        method: 'POST',
		headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id: id})
        
    });
    const data = await res.json();
    if (!res.ok || data.status !== 0) {
        throw new Error(data.message || '刪除失敗');
    }
}

async function addNRECost(id){
	
	if (NRE_excelData.data.length === 0) {
		return;
	}
	const projectData = {
			id: id,
			usim: NRE_excelData.data[0][1],
			esim: NRE_excelData.data[0][2],
			ota_5gnr: NRE_excelData.data[0][3],
			ota_lte: NRE_excelData.data[0][4],
			japan_nfc: NRE_excelData.data[0][5],
			wlan_peak_gain: NRE_excelData.data[0][6],
			enhance_mode: NRE_excelData.data[0][7],
			bt_peak_gain: NRE_excelData.data[0][8],
			wifi_ota: NRE_excelData.data[0][9],
			wifi_6e_ota: NRE_excelData.data[0][10],
			tas_pwr: NRE_excelData.data[0][11],
			wifi_6e_tput: NRE_excelData.data[0][12],
			wifi_7_tput: NRE_excelData.data[0][13],
			bt_audio_test: NRE_excelData.data[0][14]
        };
	const res = await fetch('/project/nreCostImport', {
        method: 'POST',
		headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
        
    });
    const data = await res.json();
    if (data.status !== 0) {
        showMessage(data.message || '上傳失敗');
    }
	
}

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}