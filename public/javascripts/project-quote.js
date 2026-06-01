document.addEventListener('DOMContentLoaded', function() {
    // 檢查登入狀態
    checkLoginStatus();

    // 處理登出按鈕
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    
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

