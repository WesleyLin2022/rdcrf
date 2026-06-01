document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = {
        id: document.getElementById('id').value,
        password: document.getElementById('password').value
    };
    
    fetch('/member/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            window.location.href = '/index.html';
        } else {
            alert('登入失敗');
        }
    })
    .catch(error => {
        alert('登入時發生錯誤');
    });
});