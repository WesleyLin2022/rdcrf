var express = require('express');
var router = express.Router();

const DatabaseModel = require('../modules/DBModule.js') //引入module


const secretKey = 'I_am_the_secret_key'; //JWT key


// 登入處理
router.post('/createProject', (req, res) => {
	try {
        let pid = req.body.pid;
	    let ownerId = req.body.ownerid;
		let remDate = req.body.reminderDate;
		console.log(pid);
		console.log(ownerId);
		console.log(remDate);
	    DatabaseModel.query('SELECT * FROM  projects where id=?',[pid], function (err, rows, fields) {
            if (err)
		        throw err;
	        if (rows.length < 1) {
		        newPoject();
		    }
	        else {
		        res.json({"status":1, message:"此專案名稱已建立"});
		    }
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
	
	function newPoject() {
		DatabaseModel.query('insert into projects (id, owner_id, kickoff) values (?,?,?) ',[req.body.pid, req.body.ownerid, req.body.reminderDate], function (err, rows, fields) {
            if (err) {
                res.json({"status":2, message:"專案建立失敗"});
            }
	        else {
		        res.json({"status":0, message:"專案建立成功"});
		    }
        });
	}//end of newPoject()
});

router.get("/searchProjectsId", (req, res) => {
    const search = req.query.search?.toLowerCase() || '';
	console.log(search);
    DatabaseModel.query("SELECT id FROM projects",  (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
		const filter_results = results.filter(u => u.id.toLowerCase().includes(search));
        res.json(filter_results);
    });
});

router.post("/searchProject", (req, res) => {
    const id = req.body.id;
	//console.log(id);
	const sql = "SELECT p.*, u.name AS owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ? "
    DatabaseModel.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post("/deleteExistDataInPD", (req, res) => {
    const id = req.body.id;
	const type = req.body.type;
	
    try {
	    DatabaseModel.query('DELETE FROM project_data WHERE id=? AND type=? ',[id, type], function (err, rows, fields) {
            if (err)
		        throw err;
            res.json({"status":0, message:"刪除成功"});
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post("/updateProjectNote", (req, res) => {
	const note = req.body.note;
	const id = req.body.id;
	console.log(` note=${note}, id=${id}`);
	
    try {
	    DatabaseModel.query('UPDATE projects SET  note=? WHERE id=? ',[note, id], function (err, rows, fields) {
            if (err)
		        throw err;
            res.json({"status":0, message:"更新成功"});
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post("/updateProjectKickOff", (req, res) => {
	const k_off = req.body.kickoff;
	const pid = req.body.projectId;
	
    try {
	    DatabaseModel.query('UPDATE projects SET  kickoff=? WHERE id=? ',[k_off, pid], function (err, rows, fields) {
            if (err)
		        throw err;
            res.json({"status":0, message:"更新成功"});
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post('/dataImport', function(req, res, next) {
	
	//console.log(req.body);
	
	try {
		const sql = `INSERT into project_data (bu, customer, id, forecast, type, platform_type, Ant_environment, Ant_location,
		                                       Ant_function, SAR, Ant_body, Ant_cable_type, Cable_Con, Ant_function_description, 
											   Ant_body_dimension, Ant_cable_length, Ant_grounding_size_and_AlCu_foil, 
											   Bracket_for_perf, PCB_for_cable_fix, conductive_fabric, gasket, teflon, casing, 
											   tape, mech_req, wnc, awan, inpaq, hb, htk, speed, pulse, other) 
											   values (
											   ?,?,?,?,?,?,?,?,
											   ?,?,?,?,?,?,
											   ?,?,?,
											   ?,?,?,?,?,?,
											   ?,?,?,?,?,?,?,?,?,? )`;
	    const params = [req.body.bu, req.body.customer, req.body.id, req.body.forecast, req.body.type, 
		                req.body.platform_type, req.body.Ant_environment, req.body.Ant_location,
		                req.body.Ant_function, req.body.SAR, req.body.Ant_body, req.body.Ant_cable_type, req.body.Cable_Con, req.body.Ant_function_description,
						req.body.Ant_body_dimension, req.body.Ant_cable_length, req.body.Ant_grounding_size_and_AlCu_foil,
						req.body.Bracket_for_perf, req.body.PCB_for_cable_fix, req.body.conductive_fabric,
						req.body.gasket, req.body.teflon, req.body.casing, req.body.tape, req.body.mech_req,
						req.body.wnc, req.body.awan, req.body.inpaq, req.body.hb, req.body.htk,
						req.body.speed, req.body.pulse, req.body.other];
	    
		DatabaseModel.query(sql,params, function (err, rows, fields) {
            if (err)
		        throw err;
            
            res.json({"status":0, message:"匯入成功"});
            
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
	
	/*function deleteExistData() {
		try {
	        DatabaseModel.query('DELETE FROM project_data WHERE id=? AND type=? ',[req.body.id, req.body.type ], function (err, rows, fields) {
                if (err)
		            throw err;
                console.log("Delete OK");
            });
	    }
	    catch (error) {
		    res.status(500).json({ message: '伺服器錯誤' });
	    }
	}*/
});

router.post('/deleteNRECost', function(req, res, next) {
	try {
	    DatabaseModel.query('DELETE FROM project_nre_cost WHERE id=? ',[req.body.id], function (err, rows, fields) {
            if (err)
		        throw err;
            
            res.json({"status":0, message:"nreCost刪除成功"});
            
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post('/nreCostImport', function(req, res, next) {
	try {
		const sql = `INSERT into project_nre_cost (id, usim, esim, ota_5gnr, ota_lte ,japan_nfc ,
		                                           wlan_peak_gain, enhance_mode, bt_peak_gain, wifi_ota,
												   wifi_6e_ota, tas_pwr, wifi_6e_tput, wifi_7_tput, bt_audio_test) 
												   values (
												   ?,?,?,?,?,?,
												   ?,?,?,?,
												   ?,?,?,?,? )`;
		const params = [ req.body.id, req.body.usim, req.body.esim, req.body.ota_5gnr, req.body.ota_lte, req.body.japan_nfc,
		                 req.body.wlan_peak_gain, req.body.enhance_mode, req.body.bt_peak_gain, req.body.wifi_ota,
						 req.body.wifi_6e_ota, req.body.tas_pwr, req.body.wifi_6e_tput, req.body.wifi_7_tput, req.body.bt_audio_test ];
	    DatabaseModel.query(sql, params, function (err, rows, fields) {
            if (err)
		        throw err;
            
            res.json({"status":0, message:"nreCost匯入成功"});
            
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post('/projectData_Query', function(req, res, next) {
	//input : id
	//console.log(req.body);
	
	try {
		const sql = `SELECT * from project_data WHERE id=?`;
	    const params = [req.body.id];
	    
		DatabaseModel.query(sql,params, function (err, rows, fields) {
            if (err)
		        throw err;
            
            res.json(rows);
            
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post('/projectNreCost_Query', function(req, res, next) {
	//input : id
	//console.log(req.body);
	
	try {
		const sql = `SELECT * from project_nre_cost WHERE id=?`;
	    const params = [req.body.id];
	    
		DatabaseModel.query(sql,params, function (err, rows, fields) {
            if (err)
		        throw err;
            
            res.json(rows);
            
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});


module.exports = router;