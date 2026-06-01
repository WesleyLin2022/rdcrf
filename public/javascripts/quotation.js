document.addEventListener('DOMContentLoaded', function() {
    // 檢查用戶是否已登入
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
				console.log(data.user);
                document.getElementById('userId').textContent = `Hi, ${data.user.id}`;
				//document.getElementById('userEmail').textContent = `${data.user.email}`;
			    
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        });
    }
	
});

// 頁面切換函數
function showPage(pageName) {
	const content = document.getElementById('content');
	
	// 清空當前內容
	content.innerHTML = '';
	
	// 根據頁面名稱載入對應內容
	switch(pageName) {
		case 'projectCreate':
			loadProjectCreatePage();
			break;
		case 'projectModify':
			loadProjectModifyPage();
			break;
		case 'rfqInput':
			loadRFQInputPage();
			break;
		case 'rfqQuery':
			loadRFQQueryPage();
			break;
		case 'awardInput':
			loadAwardInputPage();
			break;
		case 'awardQuery':
			loadAwardQueryPage();
			break;
		case 'changePassword':
			loadChangePasswordPage();
			break;
	}
}

// 登出處理
function logout() {
	localStorage.removeItem('token');
	window.location.href = '/login.html';
}

/*
// 各個頁面的載入函數
function loadProjectCreatePage() {
    // 實現專案建立頁面的邏輯
}

function loadProjectModifyPage() {
    // 實現專案修改頁面的邏輯
}

function loadRFQInputPage() {
    // 實現RFQ輸入頁面的邏輯
}

function loadRFQQueryPage() {
    // 實現RFQ查詢頁面的邏輯
}

function loadAwardInputPage() {
    // 實現Award輸入頁面的邏輯
}

function loadAwardQueryPage() {
    // 實現Award查詢頁面的邏輯
}

function loadChangePasswordPage() {
    // 實現修改密碼頁面的邏輯
}*/