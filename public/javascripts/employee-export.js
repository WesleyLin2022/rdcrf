window.eExport = {};   // 建立一個全域命名空間
window.eExport.employeesList = []; // 儲存所有員工資料;



$(document).ready(function () {
    const $tableBody = $("#employeeTable tbody");

    // 初始化年度選單 (2025 ~ 2030)
    const currentYear = new Date().getFullYear();
    for (let y = 2025; y <= currentYear; y++) {
        $("#yearSelect").append(
            `<option value="${y}" ${y === currentYear ? "selected" : ""}>${y}</option>`
        );
    }
    // 切換進階搜尋
    $("#toggleAdvanced").click(function () {
        $("#advancedSearch").toggle();
    });

    // 快速搜尋
    $("#quickSearch").on("input", function () {
        const value = $(this).val().toLowerCase();
        filterTable({ name: value });
    });

    // 進階搜尋
    $("#advancedSearchBtn").click(function () {
        const name = $("#searchName").val().toLowerCase();
        const dept = $("#searchDept").val().toLowerCase();
        filterTable({ name, dept });
    });

    // 全選 / 全不選
    $("#selectAll").change(function () {
        const checked = $(this).prop("checked");
        $tableBody.find("input[type=checkbox]").prop("checked", checked);
    });
	
	//登出
	$('#logoutBtn').click(handleLogout);

    // 匯出 Excel
	$("#exportBtn").click(exportSelectedEmployees);
    /*$("#exportBtn").click(function () {
        const selected = [];
        $tableBody.find("input[type=checkbox]:checked").each(function () {
            selected.push($(this).data("employee"));
        });

        if (selected.length === 0) {
            showMessage("請至少選擇一位員工");
            return;
        }

        // 呼叫後端 API 匯出
        fetch("/api/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employees: selected })
        })
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "employees.xlsx";
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(() => showMessage("匯出失敗，請稍後再試"));
    });*/

    // 初始化：載入直屬與間接員工
    /*fetch("/api/employees")
        .then(res => res.json())
        .then(data => renderTable(data))
        .catch(() => showMessage("載入員工資料失敗"));*/
		
    checkLoginStatus();
	/*
    function renderTable(data) {
        $tableBody.empty();
        data.forEach(emp => {
            const row = `<tr>
                <td><input type="checkbox" data-employee='${JSON.stringify(emp)}'></td>
                <td>${emp.id}</td>
                <td>${emp.name}</td>
                <td>${emp.department}</td>
            </tr>`;
            $tableBody.append(row);
        });
    }*/

    function filterTable({ name = "", dept = "" }) {
        $("#employeeTable tbody tr").each(function () {
            const empName = $(this).find("td:nth-child(3)").text().toLowerCase();
            const empDept = $(this).find("td:nth-child(4)").text().toLowerCase();
            const match =
                (!name || empName.includes(name)) &&
                (!dept || empDept.includes(dept));
            $(this).toggle(match);
        });
    }

    function showMessage(msg) {
        $("#modalMessage").text(msg);
        $("#messageModal").modal("show");
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
					loadEmployees(data.user.id);
				} else {
					localStorage.removeItem('token');
					window.location.href = '/login.html';
				}
			});
    }
}
	
});

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
	window.location.href = '/login.html';
}

function loadEmployees(id) {
    fetch(`/manager/getSubordinatesById?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
                window.eExport.employeesList = data.employees.slice();
				renderTable()
				//initDepartmentCode();
            }
        })
        .catch(error => console.error('Error:', error));
}

function renderTable() {
	const $tableBody = $("#employeeTable tbody");
	$tableBody.empty();
	window.eExport.employeesList.forEach(emp => {
		const row = `<tr>
			<td><input type="checkbox" data-employee='${JSON.stringify(emp)}'></td>
			<td>${emp.id}</td>
			<td>${emp.name}</td>
			<td>${emp.dn}</td>
		</tr>`;
		$tableBody.append(row);
	});
}

async function exportSelectedEmployees() {
	const selectedEmployees = [];
	const ids = [];

	$("#employeeTable tbody input[type='checkbox']:checked").each(function () {
	    const empData = JSON.parse($(this).attr("data-employee"));
		//console.log(empData);
		
		//只取 id, name, dn資訊，並設定欄位名稱
		const filteredData = {
            員工工號: empData.id,
            員工姓名: empData.name,
            部門代碼: empData.dn
        };
	    selectedEmployees.push(filteredData);
	    ids.push(empData.id);
	});

	if (ids.length === 0) {
	    alert("請至少勾選一位員工！");
	    return;
	}

	
	const year = $("#yearSelect").val();
    const month = $("#stageSelect").val();
	//console.log(year);
	//console.log(month);
	
	//設定excel分頁2的標頭
	const summaryHeaderMap = {
        id: '員工工號',
        name: '員工姓名',
        total_supervisor_score: '主管評分總和',
		wordCount: 'ai評語字數'
    };

    //設定excel分頁3的標頭
    const detailsHeaderMap = {
        id: '員工工號',
        name: '員工姓名',
        type: '論功行賞',
        item: '項目要點',
        contribution1: '具體貢獻簡述1',
		contribution2: '具體貢獻簡述2',
		contribution3: '具體貢獻簡述3',
        supervisor_score: '主管評分'
    };
    
    //設定excel分頁4的標頭
    const commentsHeaderMap = {
        id: '員工工號',
        name: '員工姓名',
        comment: 'AI主管評語',
        selfEvaluation: 'AI自我評語'
    };

	try {
	    // 🔹 呼叫後端 API
	    const response = await fetch("/performance/getEmployeeScores", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids, year, month })
	    });

		if (!response.ok) throw new Error("後端 API 錯誤");
		const { summaryA, summaryB, detailsA, detailsB, commentAll } = await response.json();

		// 🔹 建立 Excel
		const workbook = XLSX.utils.book_new();

		// 分頁 1: 前端 data-employee
		const ws1 = XLSX.utils.json_to_sheet(selectedEmployees);
		XLSX.utils.book_append_sheet(workbook, ws1, "基本資料");

		// 分頁 2: 一專以上總和排序
		const summaryDataA = renameHeaders(summaryA, summaryHeaderMap);
		const ws2 = XLSX.utils.json_to_sheet(summaryDataA);
		XLSX.utils.book_append_sheet(workbook, ws2, "一專以上評分總和排序");
		
		// 分頁 3: 一專以上KPI明細 (依 summaryA 排序)
		const detailsDataA = renameHeaders(detailsA, detailsHeaderMap);
		const ws3 = XLSX.utils.json_to_sheet(detailsDataA);
		XLSX.utils.book_append_sheet(workbook, ws3, "一專以上工作項目明細");
        ws3['!cols'] = [ { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 45 }, { wch: 45 }, { wch: 45 }, { wch: 10 }];
		
		// 分頁 3: 二專以下總和排序
		const summaryDataB = renameHeaders(summaryB, summaryHeaderMap);
		const ws4 = XLSX.utils.json_to_sheet(summaryDataB);
		XLSX.utils.book_append_sheet(workbook, ws4, "二專以下評分總和排序");
        

		// 分頁 3: 二專以下KPI明細 (依 summaryB 排序)
		const detailsDataB = renameHeaders(detailsB, detailsHeaderMap);
		const ws5 = XLSX.utils.json_to_sheet(detailsDataB);
		XLSX.utils.book_append_sheet(workbook, ws5, "二專以下工作項目明細");
        ws5['!cols'] = [ { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 45 }, { wch: 45 }, { wch: 45 }, { wch: 10 }];
        
        // 分頁 4: 所有員工的ai 評論
		const commentsData = renameHeaders(commentAll, commentsHeaderMap);
		const ws6 = XLSX.utils.json_to_sheet(commentsData);
		XLSX.utils.book_append_sheet(workbook, ws6, "所有員工AI評語");
        ws6['!cols'] = [ { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 40 }];

		// 下載 Excel
		XLSX.writeFile(workbook, "員工資料.xlsx");
	} catch (err) {
	    console.error(err);
	    alert("匯出失敗，請檢查後端或網路。");
	}
	
	function renameHeaders(data, headerMap) {
        return data.map(row => {
            const newRow = {};
            for (const key in headerMap) {
                newRow[headerMap[key]] = row[key];
            }
            return newRow;
        });
    }
}
