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
				//console.log(data.user);
                document.getElementById('userId').textContent = `Hi，${data.user.id}`;
			    
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        });
    }
    
    // 登出功能
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });
});