var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var multer = require('multer');
var path = require('path');
const fs = require('fs');
const DatabaseModel = require('../modules/DBModule.js') //引入module

var storageRFQ = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, './public/rfq');
	},
	filename: function(req, file, cb){
		let str = file.originalname.split('.');
		cb(null,  Date.now() +'.'+str[1]);
	}
});

var storageNRE = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, './public/nre');
	},
	filename: function(req, file, cb){
		let str = file.originalname.split('.');
		cb(null, Date.now() + '.'+str[1]);
	}
});

var storageAward = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, './public/award');
	},
	filename: function(req, file, cb){
		let str = file.originalname.split('.');
		cb(null, Date.now()+'.'+str[1]);
	}
});

var storageAll = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, './public/files');
	},
	filename: function(req, file, cb){
		let str = file.originalname.split('.');
		cb(null,  Date.now() +'.'+str[1]);
	}
});

var upload_rfg = multer({storage: storageRFQ});
var upload_nre = multer({storage: storageNRE});
var upload_award = multer({storage: storageAward});

var upload_file = multer({storage: storageAll});

///---------------------------------------------------
router.post("/upload_file",  upload_file.single("file"), function(req, res, next) {
	/*
	input file, id, ori_filename, type;
	*/
	const uploadDir = path.join(path.resolve('./'), 'public');
	const rfqDir = path.join(uploadDir, 'files');
	//console.log(rfqDir);
	
	
	//----------------------------------------------------
	//check file if exists ?
	DatabaseModel.query('SELECT * FROM project_emails WHERE id = ? AND type = ?',[req.body.id, req.body.type], function (err, rows, fields) {
        if (err) {
            res.json({"status":1, "msg":err});
			return;
        }
	    if (rows.length == 0){
		    DBprocessing(0);
		}
		else if (rows.length == 1){
			if (req.body.type != "NRE") {
				const previousfile = path.join(rfqDir, rows[0].file_name);
			    if (fs.existsSync(previousfile)){
				    fs.unlinkSync(previousfile);
			    }
			    DBprocessing(1, rows[0].serial_number);
			}//end of if != NRE
			else {
				DBprocessing(0);
			}
		}
		else {
			if (req.body.type == "NRE") {
				if (rows.length > 1 && rows.length < 5) {
					DBprocessing(0);
				}
				else if (rows.length == 5) {
					res.json({"status":5, "msg":"NRE檔案已滿，請先刪除不需要的檔案再上傳"});
					/*const sortedArray = sortMessageFilenames(rows);
					const previousfile = path.join(rfqDir, sortedArray[0].file_name);
			        if (fs.existsSync(previousfile)){
				        fs.unlinkSync(previousfile);
			        }
					
					DBprocessing(1, sortedArray[0].serial_number);*/
					
				}
				else {
					res.json({"status":3, "msg":"too many data"});
				}
			}
			else {
			    res.json({"status":3, "msg":"too many data"});
			}
		}
    });
	
	
	function DBprocessing(opt, serial_number = 0) {
		switch (opt){
			case 0:
			    //新增資料庫欄位
		        DatabaseModel.query('INSERT INTO project_emails (id, file_name, original_name, type) values (?, ?, ?, ?)  ',[req.body.id, req.file.filename, req.body.ori_filename, req.body.type], function (err, rows, fields) {
                    if (err) {
                        res.json({"status":2, "msg":"email save fail"});
                    }
	                else {
		                res.json({"status":0, "msg":"email save success"});
		            }
                });
			    break;
            case 1:
			    //更新資料庫欄位
				console.log(serial_number);
		        DatabaseModel.query('UPDATE project_emails set file_name=?, original_name=? WHERE serial_number=? ',[req.file.filename, req.body.ori_filename, serial_number], function (err, rows, fields) {
                    if (err) {
                        res.json({"status":2, "msg":"email update fail"});
                    }
	                else {
		                res.json({"status":0, "msg":"email update success"});
		            }
                });
			    break;
			
		}
		
	}
	
	function sortMessageFilenames(arr) {
        if (!Array.isArray(arr)) {
            throw new Error("輸入必須是陣列");
        }
        

        return arr.slice().sort((a, b) => {
            const numA = parseInt(a.file_name.split('.')[0], 10);
            const numB = parseInt(b.file_name.split('.')[0], 10);
            return numA - numB;
        });// 使用 slice() 保留原始陣列不被修改
    }
});


router.get("/download_file", (req, res) => {
	//input: sn
	DatabaseModel.query('SELECT * FROM project_emails WHERE serial_number=? ',[req.query.sn], function (err, rows, fields) {
        if (err) {
            res.json({"status":1, "msg":err});
			return;
        }
	    if (rows.length == 1){
			//if file exists then remove
			//let result = [];
			const uploadDir = path.join(path.resolve('./'), 'public');
	        const rfqDir = path.join(uploadDir, 'files');
			const currentfile = path.join(rfqDir, rows[0].file_name);
			
			if (fs.existsSync(currentfile)){
				res.download(currentfile, rows[0].file_name);
			}
		    else {
				res.json({"status":3, "msg":"file miss"});
			}
		}
		else {
			res.json({"status":2, "msg":"data not only one"});
		}
    });
});

router.post("/delete_file", (req, res) => {
	//input: sn, filename
	DatabaseModel.query('DELETE FROM project_emails WHERE serial_number=? ',[req.body.sn], function (err, rows, fields) {
        if (err) {
            res.json({"status":1, "msg":err});
        }
		else {
			const uploadDir = path.join(path.resolve('./'), 'public');
	        const rfqDir = path.join(uploadDir, 'files');
			const currentfile = path.join(rfqDir, req.body.filename);
			
			if (fs.existsSync(currentfile)){
				fs.unlinkSync(currentfile);
			}
			res.json({"status":0, "msg":"delete success"});
		}
    });
});

router.post("/getProjectFiles", (req, res) => {
	//input: id
	//get all files of ID
	DatabaseModel.query('SELECT * FROM project_emails WHERE id=? ',[req.body.id], function (err, rows, fields) {
        if (err) {
            res.json({"status":1, "msg":err});
			return;
        }
	    if (rows.length > 0 ){
			//if file exists then remove
			let result = [];
		    for (let i = 0 ; i < rows.length; i++) {
				let str = rows[i].file_name.split('.');
				result.push({filename:rows[i].file_name, originalname:rows[i].original_name, fileType:rows[i].type, uploadTime:str[0], sn:rows[i].serial_number});
		    }
		    res.json({"status":0, "files":result});
		}
		else {
			res.json({"status":2, "msg":"no data"});
		}
    });
});

///---------------------------------------------------

router.post("/upload_rfq",  upload_rfg.single("file"), function(req, res, next) {
	/*
	input file, id, ori_filename;
	*/
	const uploadDir = path.join(path.resolve('./'), 'public');
	const rfqDir = path.join(uploadDir, 'rfq');
	//console.log(rfqDir);
	
	
	//----------------------------------------------------
	//check file if exists ?
	DatabaseModel.query('SELECT * FROM project_emails WHERE id = ? AND type = ?',[req.body.id, "RFQ"], function (err, rows, fields) {
        if (err) {
            res.json({"status":1, "msg":err});
			return;
        }
	    if (rows.length == 0){
		    DBprocessing(0);
		}
		else if (rows.length == 1){
			const previousfile = path.join(rfqDir, rows[0].file_name);
			if (fs.existsSync(previousfile)){
				fs.unlinkSync(previousfile);
			}
			DBprocessing(1);
		}
		else {
			res.json({"status":3, "msg":"too many data"});
		}
    });
	
	
	function DBprocessing(num) {
		switch (num){
			case 0:
			    //新增資料庫欄位
		        DatabaseModel.query('INSERT INTO project_emails values (?, ?, ?, ?)  ',[req.body.id, req.file.filename, req.body.ori_filename, "RFQ"], function (err, rows, fields) {
                    if (err) {
                        res.json({"status":2, "msg":"RFQ email save fail"});
                    }
	                else {
		                res.json({"status":0, "msg":"RFQ email save success"});
		            }
                });
			    break;
            case 1:
			    //更新資料庫欄位
		        DatabaseModel.query('UPDATE project_emails set file_name=?, original_name=? WHERE id=? AND type=? ',[req.file.filename, req.body.ori_filename, req.body.id, "RFQ"], function (err, rows, fields) {
                    if (err) {
                        res.json({"status":2, "msg":"RFQ email update fail"});
                    }
	                else {
		                res.json({"status":0, "msg":"RFQ email update success"});
		            }
                });
			    break;
			
		}
		
	}
});


router.get("/download_rfq", (req, res) => {
    const pid = req.query.id;
	console.log(pid);
    DatabaseModel.query('SELECT rfqfile FROM projects where id=?',[req.query.id], function (err, rows, fields) {
        if (err) {
            res.json({"status":3, "msg":err});
			return;
        }
	    if (rows.length == 1){
			//if file exists then remove
			const uploadDir = path.join(path.resolve('./'), 'public');
	        const rfqDir = path.join(uploadDir, 'rfq');
			const currentfile = path.join(rfqDir, rows[0].rfqfile);
			if (fs.existsSync(currentfile)){
				res.download(currentfile, rows[0].rfqfile);
			}
		    else {
				res.json({"status":2, "msg":"file doesn't exist"});
			}
		}
		else {
			res.json({"status":1, "msg":"too many data"});
		}
    });
});

router.post("/upload_nre",  upload_nre.single("file"), function(req, res, next) {
	//console.log(req.query.id);
	//console.log(req.query.item);
	const uploadDir = path.join(path.resolve('./'), 'public');
	const nreDir = path.join(uploadDir, 'nre');
	//console.log(nreDir);
	
	let items = "";
	switch (req.query.item){
		case "1": //usim
		   items = "usim";
		   console.log(items);
		   break;
		case "2": //esim
		   items = "esim";
		   console.log(items);
		   break;
		case "3": //ota_5gnr
		   items = "ota_5gnr";
		   console.log(items);
		   break;
		case "4": //ota_lte
		   items = "ota_lte";
		   console.log(items);
		   break;
		case "5": //japan_nfc
		   items = "japan_nfc";
		   console.log(items);
		   break;
		case "6": //wlan_peak_gain
		   items = "wlan_peak_gain";
		   console.log(items);
		   break;
		case "7": //enhance_mode
		   items = "enhance_mode";
		   console.log(items);
		   break;
		case "8": //bt_peak_gain
		   items = "bt_peak_gain";
		   console.log(items);
		   break;
		case "9": //wifi_ota
		   items = "wifi_ota";
		   console.log(items);
		   break;
		case "10": //wifi_6e_ota
		   items = "wifi_6e_ota";
		   console.log(items);
		   break;
		case "11": //tas_pwr
		   items = "tas_pwr";
		   console.log(items);
		   break;
		case "12": //wifi_6e_tput
		   items = "wifi_6e_tput";
		   console.log(items);
		   break;
		case "13": //wifi_7_tput
		   items = "wifi_7_tput";
		   console.log(items);
		   break;
		case "14": //bt_audio_test
		   items = "bt_audio_test";
		   console.log(items);
		   break;
		default: //default
		   items = "other";
		   console.log(items);
		   break;
	}
	
	//check file if exists ?
	//DatabaseModel.query('SELECT ? FROM project_nre_email where id=?',[items, req.query.id], function (err, rows, fields) {
	DatabaseModel.query('SELECT * FROM project_nre_email where id=?',[req.query.id], function (err, rows, fields) {
        if (err) {
            res.json({"status":2, "msg":err});
			return;
        }
	    if (rows.length == 1){
			//if file exists then remove
			//console.log(rows[0][items]);
			if (rows[0][items].length != 0 ) {
				const previousfile = path.join(nreDir, rows[0][items]);
			    if (fs.existsSync(previousfile)){
				    fs.unlinkSync(previousfile);
			    }
			}
		    fieldupdate();
		}
		else {
			res.json({"status":1, "msg":"too many data"});
		}
    });
	
	
	function fieldupdate() {
		
		//更新資料庫欄位
		const sql = `update project_nre_email set ${items} = ? where id=?`;
		DatabaseModel.query(sql,[req.file.filename, req.query.id], function (err, rows, fields) {
            if (err) {
			    console.error("DB Update Error:", err); // Log 起來即可
                res.json({"status":2, "msg":"file update fail"});
				return;
            }
	        
		    res.json({"status":0, "msg":"file save success"});
        });
	}
});

router.get("/download_nre", (req, res) => {
    const pid = req.query.id;
	
	let items = "";
	switch (req.query.item){
		case "1": //usim
		   items = "usim";
		   console.log(items);
		   break;
		case "2": //esim
		   items = "esim";
		   console.log(items);
		   break;
		case "3": //ota_5gnr
		   items = "ota_5gnr";
		   console.log(items);
		   break;
		case "4": //ota_lte
		   items = "ota_lte";
		   console.log(items);
		   break;
		case "5": //japan_nfc
		   items = "japan_nfc";
		   console.log(items);
		   break;
		case "6": //wlan_peak_gain
		   items = "wlan_peak_gain";
		   console.log(items);
		   break;
		case "7": //enhance_mode
		   items = "enhance_mode";
		   console.log(items);
		   break;
		case "8": //bt_peak_gain
		   items = "bt_peak_gain";
		   console.log(items);
		   break;
		case "9": //wifi_ota
		   items = "wifi_ota";
		   console.log(items);
		   break;
		case "10": //wifi_6e_ota
		   items = "wifi_6e_ota";
		   console.log(items);
		   break;
		case "11": //tas_pwr
		   items = "tas_pwr";
		   console.log(items);
		   break;
		case "12": //wifi_6e_tput
		   items = "wifi_6e_tput";
		   console.log(items);
		   break;
		case "13": //wifi_7_tput
		   items = "wifi_7_tput";
		   console.log(items);
		   break;
		case "14": //bt_audio_test
		   items = "bt_audio_test";
		   console.log(items);
		   break;
		default: //default
		   items = "";
		   console.log(items);
		   break;
	}
    DatabaseModel.query('SELECT * FROM project_nre_email where id=?',[req.query.id], function (err, rows, fields) {
        if (err) {
            res.json({"status":3, "msg":err});
			return;
        }
	    if (rows.length == 1){
			//if file exists then remove
			if (rows[0][items].length == 0) {
				return 
				
				res.json({"status":2, "msg":"file doesn't exist"});
			}
			const uploadDir = path.join(path.resolve('./'), 'public');
	        const rfqDir = path.join(uploadDir, 'nre');
			const currentfile = path.join(rfqDir, rows[0][items]);
			if (fs.existsSync(currentfile)){
				res.download(currentfile, rows[0][items]);
			}
		}
		else {
			res.json({"status":1, "msg":"too many data"});
		}
    });
});

router.post("/upload_award",  upload_award.single("file"), function(req, res, next) {
	//console.log(req.query.id);
	//console.log(req.file);
	const uploadDir = path.join(path.resolve('./'), 'public');
	const awardDir = path.join(uploadDir, 'award');
	
	
	//check file if exists ?
	DatabaseModel.query('SELECT awardfile FROM projects where id=?',[req.query.id], function (err, rows, fields) {
        if (err) {
            res.json({"status":2, "msg":err});
			return;
        }
	    if (rows.length == 1){
			//if file exists then remove
			if (rows[0].awardfile.length != 0 ) {
				console.log(rows[0].awardfile);
				const previousfile = path.join(awardDir, rows[0].awardfile);
			    if (fs.existsSync(previousfile)){
				    fs.unlinkSync(previousfile);
			    }
			}
			
		    fileprocessing();
		}
		else {
			res.json({"status":1, "msg":"too many data"});
		}
    });
	
	
	function fileprocessing() {
		
		//更新資料庫欄位
		DatabaseModel.query('update projects set awardfile=? where id=? ',[req.file.filename, req.query.id], function (err, rows, fields) {
            if (err) {
                res.json({"status":2, "msg":"file save fail"});
            }
	        else {
		        res.json({"status":0, "msg":"file save success"});
		    }
        });
	}
});

router.post("/download_award", (req, res) => {
    const pid = req.body.id;
	
    DatabaseModel.query('SELECT awardfile FROM projects where id=?',[pid], function (err, rows, fields) {
        if (err) {
            res.json({"status":3, "msg":err});
			return;
        }
	    if (rows.length == 1){
			//if file exists then remove
			const uploadDir = path.join(path.resolve('./'), 'public');
	        const rfqDir = path.join(uploadDir, 'rfq');
			const currentfile = path.join(rfqDir, rows[0].awardfile);
			if (fs.existsSync(currentfile)){
				res.download(currentfile, rows[0].awardfile);
			}
		    else {
				res.json({"status":2, "msg":"file doesn't exist"});
			}
		}
		else {
			res.json({"status":1, "msg":"too many data"});
		}
    });
});

router.post("/query_RFQ_NRE", (req, res) => {
    const pid = req.body.id;
	
    DatabaseModel.query('SELECT * FROM projects where id=?',[req.body.id], function (err, rows, fields) {
        if (err) {
            res.json({"status":3, "msg":err});
			return;
        }
	    if (rows.length == 1){
			let result = [];
			//RFQ
			if (rows[0].rfq) {
				let str = rows[0].rfq.split('.');
				result.push({filename:rows[0].rfq, originalname:rows[0].rfq_original_name, fileType:"RFQ", uploadTime:str[0]});
			}
			else {
				result.push({filename:"", originalname:"", fileType:"", uploadTime:""});
			}
			//Award
			if (rows[0].award) {
				let str = rows[0].award.split('.');
				result.push({filename:rows[0].award, originalname:rows[0].award_original_name, fileType:"Award", uploadTime:str[0]});
			}
			else {
				result.push({filename:"", originalname:"", fileType:"", uploadTime:""});
			}
			//NRE1
			if (rows[0].nre1) {
				let str = rows[0].nre1.split('.');
				result.push({filename:rows[0].nre1, originalname:rows[0].nre1_original_name, fileType:"NRE", uploadTime:str[0]});
			}
			else {
				result.push({filename:"", originalname:"", fileType:"", uploadTime:""});
			}
			//NRE2
			if (rows[0].nre2) {
				let str = rows[0].nre2.split('.');
				result.push({filename:rows[0].nre2, originalname:rows[0].nre2_original_name, fileType:"NRE", uploadTime:str[0]});
			}
			else {
				result.push({filename:"", originalname:"", fileType:"", uploadTime:""});
			}
			//NRE3
			if (rows[0].nre3) {
				let str = rows[0].nre3.split('.');
				result.push({filename:rows[0].nre3, originalname:rows[0].nre3_original_name, fileType:"NRE", uploadTime:str[0]});
			}
			else {
				result.push({filename:"", originalname:"", fileType:"", uploadTime:""});
			}
			//NRE4
			if (rows[0].nre4) {
				let str = rows[0].nre4.split('.');
				result.push({filename:rows[0].nre4, originalname:rows[0].nre4_original_name, fileType:"NRE", uploadTime:str[0]});
			}
			else {
				result.push({filename:"", originalname:"", fileType:"", uploadTime:""});
			}
			//NRE5
			if (rows[0].nre5) {
				let str = rows[0].nre5.split('.');
				result.push({filename:rows[0].nre5, originalname:rows[0].nre5_original_name, fileType:"NRE", uploadTime:str[0]});
			}
			else {
				result.push({filename:"", originalname:"", fileType:"", uploadTime:""});
			}
			
			res.json({"status":0, "files":result});
		}
		else {
			res.json({"status":1, "msg":"no data"});
		}
    });
});

module.exports = router;
