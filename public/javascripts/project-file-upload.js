document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Select2
    $('#projectId').select2({
        placeholder: '請選擇或輸入專案名稱',
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

    // 處理表單提交
    document.getElementById('fileUploadForm').addEventListener('submit', handleFileUpload);

    // 監聽專案選擇變更
    $('#projectId').on('change', loadProjectFiles);
});

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

function handleFileUpload(e) {
    e.preventDefault();
	
	const projectIdEl = document.getElementById('projectId');
    const fileTypeEl = document.getElementById('fileType');
    const msgFileEl = document.getElementById('msgFile');

    const projectId = document.getElementById('projectId').value;
	const fileType = document.getElementById('fileType').value;
    const file = document.getElementById('msgFile').files[0];

    if (!projectId || !fileType || !file) {
        showMessage('請選擇專案編號、文件類型和上傳檔案');
        return;
    }
	

    const formData = new FormData();
    formData.append('id', projectId);
	formData.append('ori_filename', file.name.replace('.msg', ''));
	formData.append('type', fileType);
    formData.append('file', file);

    const progressBar = document.querySelector('#uploadProgress .progress-bar');
    document.getElementById('uploadProgress').classList.remove('d-none');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/file/upload_file', true);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressBar.textContent = Math.round(percentComplete) + '%';
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.status == 0) {
                showMessage('檔案上傳成功');
                
                loadProjectFiles();
				//document.getElementById('fileUploadForm').reset();
				// 清空檔案欄位，但保留下拉選單的值
				msgFileEl.value = "";
				fileTypeEl.value = "";
            } 
			else if (response.status == 5 ){
				showMessage(response.msg);
			}
			else {
                showMessage(response.message || '上傳失敗');
            }
        } else {
            showMessage('上傳失敗');
        }
        document.getElementById('uploadProgress').classList.add('d-none');
    };

    xhr.onerror = function() {
        showMessage('上傳時發生錯誤');
        document.getElementById('uploadProgress').classList.add('d-none');
    };

    xhr.send(formData);
}

function loadProjectFiles() {
    const projectId = document.getElementById('projectId').value;
	
    if (!projectId) {
        document.getElementById('fileList').classList.add('d-none');
        return;
    }
	try {
	    fetch('/file/getProjectFiles', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({id:projectId})
		})
		.then(res => res.json())
		.then(data => {
			if (data.status == 0){
				displayFiles(data.files);
			}
			else {
				showMessage('尚未上傳檔案');
				displayFiles(data.files);
			}
		});
	} catch (error) {
		showMessage('系統錯誤，請稍後再試');
		
	}
}

function cleanTypeFileSelect(){
	const typeselect = document.getElementById("fileType");
    typeselect.selectedIndex = "";
	
	const fileselect = document.getElementById("msgFile");
	typeselect.value = null;
}

function displayFiles(files) {
    const fileListContent = document.getElementById('fileListContent');
    fileListContent.innerHTML = '';
	customSortByStatus(files, "fileType");

    files.forEach(file => {
		if (!file.filename) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${file.filename}</td>
			<td>${file.originalname}</td>
			<td>${file.fileType}</td>
            <td>${new Date(Number(file.uploadTime)).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-primary me-2" onclick="downloadFile('${file.sn}')">下載</button>
                <button class="btn btn-sm btn-danger" onclick="deleteFile('${file.sn}', '${file.filename}')">刪除</button>
            </td>
        `;
        fileListContent.appendChild(tr);
    });

    document.getElementById('fileList').classList.remove('d-none');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function customSortByStatus(data, key) {
    const order = { "RFQ": 0, "Award": 1, "NRE": 2 };

    return data.sort((a, b) => {
        return order[a[key]] - order[b[key]];
    });
}

function downloadFile(fileSN) {
    window.location.href = `/file/download_file?sn=${fileSN}`;
}

function deleteFile(fileSN, filename) {
    if (!confirm('確定要刪除此檔案嗎？')) return;
	
	try {
	    fetch('/file/delete_file', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({sn:fileSN, filename:filename})
		})
		.then(res => res.json())
		.then(data => {
			if (data.status == 0){
				loadProjectFiles();
				showMessage('檔案已刪除');
			}
			else {
				showMessage(data.message || '無法刪除');
			}
		});
	} catch (error) {
		showMessage('系統錯誤，請稍後再試');
		
	}
}

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}