// ==UserScript==
// @name         Seal URL Generator
// @namespace    https://github.com/KaneshiroTakeshi000/Seal-URL-Generator
// @version      1.0
// @description  從遊戲內獲取神姬、幻獸、英靈資料，並自動產生與跳轉至海豹表
// @author       Kaneshiro Takeshi
// @match        https://r.kamihimeproject.net/front/cocos2d-proj/components-pc/game/app.html
// @match        https://g.kamihimeproject.net/front/cocos2d-proj/components-pc/game/app.html
// @match        https://gskh-api-r-zh.prod.skh.johren.games/front/cocos2d-proj/components-pc/game/app.html
// @match        https://gskh-api-g-zh.prod.skh.johren.games/front/cocos2d-proj/components-pc/game/app.html
// @match        https://d2bqgmeis0s2xb.cloudfront.net/front/cocos2d-proj/components-pc/game/app.html
// @match        https://du5e2cube3h3c.cloudfront.net/front/cocos2d-proj/components-pc/game/app.html
// @match        https://d39cq07z7xwhr4.cloudfront.net/front/cocos2d-proj/components-pc/game/app.html
// @match        https://gnkh-api-r.prod.nkh.dmmgames.com/front/cocos2d-proj/components-pc/game/app.html
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @connect      gogopowerrangers.neocities.org
// ==/UserScript==

/* global kh */
(function () {
	'use strict';
	// 設定
	const SEAL_URL = 'https://gogopowerrangers.neocities.org/seal';
	const SEAL_PAGE_URL = SEAL_URL;
	const BASE_SCRIPT_URL = 'https://gogopowerrangers.neocities.org/seal/scripts/';
	const DATABASE_NAMES = {HimeData: 'HimeData',EidolonData: 'EidolonData', SoulData: 'SoulData'};

	const EXPORT_EVENT = 'KamihimeDataExported';
	const EXPORT_ERROR_EVENT = 'KamihimeDataExportError';

	let isExporting = false;
	// 工具函數
	function log(message, ...args) {console.log(`[SealExport] ${message}`, ...args);}
	function showError(message, error) {
		console.error(`[SealExport] ${message}`, error || '');
		alert(message);
	}

	function normalizeAbsoluteUrl(url, baseUrl = SEAL_PAGE_URL) {
		try {
			return new URL(url, baseUrl).href;
		} catch (_) {
			return null;
		}
	}
	//主流程
	function startExportProcess() {
		if (isExporting) {log('匯出作業正在進行中，忽略重複觸發。');return;}

		isExporting = true;
		log('開始匯出玩家資料...');
		window.addEventListener(EXPORT_EVENT, handleExportedData, { once: true });
		window.addEventListener(EXPORT_ERROR_EVENT, handleExportError, { once: true });
		try {
			const script = document.createElement('script');
			script.textContent = `(${injectedGameLogic.toString()})(${JSON.stringify(EXPORT_EVENT)}, ${JSON.stringify(EXPORT_ERROR_EVENT)});`;
			(document.body || document.documentElement).appendChild(script);
			script.remove();
		} catch (error) {
			cleanupExportState();
			showError('無法啟動資料擷取程序。', error);
		}
	}
	// 注入到遊戲頁面
	async function injectedGameLogic(exportEventName, exportErrorEventName) {
		const debugLog = (msg, ...args) => console.log('[SealExport] ' + msg, ...args);
		try {
			const exportData = {
				player: {id: 0, name: 'unknown', from: 'unknown'}, characters: [], summons: [], jobs: []};
			const httpClient = kh.createInstance('HttpConnection');
			const apiPlayers = kh.createInstance('apiAPlayers');
			if (!httpClient) {throw new Error('無法建立 HttpConnection');}
			if (apiPlayers) {
				debugLog('load player...');
				const playerRes = await apiPlayers.getMeNumeric();
				exportData.player.id = Number(playerRes?.body?.a_player_id) || 0;
				exportData.player.name = playerRes?.body?.name || 'unknown';
			}
			debugLog('load characters...');
			await httpClient.post({
				url: `${kh.env.urlRoot}/a_players/me/display_filter/book_chara`,
				json: {
					rarity: [],
					element_type: [],
					character_type: [],
					proper_weapon_type: []
				}
			}, 'unblock');
			const charactersRes = await httpClient.get({
				url: `${kh.env.urlRoot}/a_characters`,
				json: {
					display_filter_name: 'book_chara',
					page: 1,
					per_page: 100000,
					from_tower: false
				}
			}, 'unblock');
			if (Array.isArray(charactersRes?.body?.data)) {
				charactersRes.body.data.forEach(item => {
					const id = Number(item?.character_id);
					if (Number.isFinite(id) && id > 0) {
						exportData.characters.push(id);
					}
				});
			}
			debugLog('load summons...');
			await httpClient.post({
				url: `${kh.env.urlRoot}/a_players/me/display_filter/book_summon`,
				json: {rarity: [], element_type: [], grade: []}
			}, 'unblock');
			const summonsRes = await httpClient.get({
				url: `${kh.env.urlRoot}/a_summons`,
				json: {display_filter_name: 'book_summon', page: 1, per_page: 100000}
			}, 'unblock');
			if (Array.isArray(summonsRes?.body?.data)) {
				summonsRes.body.data.forEach(item => {
					const id = Number(item?.summon_id);
					if (Number.isFinite(id) && id > 0) {
						exportData.summons.push(id);
					}
				});
			}
			debugLog('load jobs...');
			const jobsRes = await httpClient.get({
				url: `${kh.env.urlRoot}/a_jobs`
			}, 'unblock');

			if (Array.isArray(jobsRes?.body?.data)) {
				jobsRes.body.data.forEach(item => {
					if (!item?.is_acquired) {return;}
					const id = Number(item?.job_id);
					if (Number.isFinite(id) && id > 0) {
						exportData.jobs.push(id);
					}
				});
			}
			debugLog('Data collection complete. Sending to Tampermonkey...');
			window.dispatchEvent(new CustomEvent(exportEventName, {detail: exportData}));
		} catch (error) {
			const message = error?.message || String(error);
			debugLog('Error: ' + message);
			window.dispatchEvent(new CustomEvent(exportErrorEventName, {detail: message}));
		}
	}
	//接收遊戲資料
	async function handleExportedData(event) {
		const gameData = event.detail;
		log('Game Data Received:', gameData);
		try {
			const databases = await loadSealDatabases();
			const finalUrl = generateSealUrl(
				gameData,
				databases.HimeData,
				databases.EidolonData,
				databases.SoulData
			);
			log('Seal URL generated:', finalUrl);
			GM_openInTab(finalUrl, {active: true, insert: true, setParent: true});
		} catch (error) {
			showError(`獲取海豹表資料失敗：${error?.message || error}`);
		} finally {
			cleanupExportState();
		}
	}
	function handleExportError(event) {
		cleanupExportState();
		const message = event?.detail || '獲取遊戲資料失敗，請確認是否在登入後的遊戲主畫面中執行。';
		showError(`獲取遊戲資料失敗：${message}`);
	}

	function cleanupExportState() {
		isExporting = false;
	}
	// HTTP / Script 載入
	function gmRequestText(url, label = url) {
		return new Promise((resolve, reject) => {
			GM_xmlhttpRequest({
				method: 'GET',
				url,
				timeout: 15000,
				onload: response => {
					if (response.status >= 200 && response.status < 300) {
						resolve(response.responseText);
					} else {
						reject(new Error(`${label} HTTP ${response.status}`));
					}
				},
				onerror: () => reject(new Error(`${label} 網路錯誤`)),
				ontimeout: () => reject(new Error(`${label} 下載逾時`))
			});
		});
	}

	function extractScriptSources(html) {
		const result = [];
		const seen = new Set();
		const regex = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
		let match;

		while ((match = regex.exec(html)) !== null) {
			const absoluteUrl = normalizeAbsoluteUrl(match[1]);
			if (!absoluteUrl || seen.has(absoluteUrl)) {continue;}
			try {
				const parsed = new URL(absoluteUrl);
				if (parsed.hostname !== 'gogopowerrangers.neocities.org') {
					continue;
				}
			} catch (_) {
				continue;
			}
			seen.add(absoluteUrl);
			result.push(absoluteUrl);
		}
		return result;
	}

	function getFileName(url) {
		try {
			return decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
		} catch (_) {
			return '';
		}
	}

	async function tryLoadKnownDatabasePaths(dbName) {
		const candidates = [
			`${BASE_SCRIPT_URL}${dbName}.js`,
			`${SEAL_URL}/${dbName}.js`,
			`${SEAL_URL}/scripts/${dbName}.js`,
			`https://gogopowerrangers.neocities.org/${dbName}.js`
		];
		for (const url of [...new Set(candidates)]) {
			try {
				log(`嘗試載入 ${dbName}: ${url}`);
				const text = await gmRequestText(url, `${dbName} (${url})`);
				if (isLikelyDatabaseScript(text, dbName)) {
					log(`${dbName} 載入成功: ${url}`);
					return text;
				}
				log(`${dbName} 下載成功但內容不符合預期: ${url}`);
			} catch (error) {
				log(`${dbName} 路徑失敗: ${url} -> ${error.message}`);
			}
		}
		return null;
	}

	function isLikelyDatabaseScript(text, dbName) {
		if (typeof text !== 'string' || !text.trim()) {
			return false;
		}
		const declaration = new RegExp(`(?:const|let|var)\\s+${dbName}\\s*=\\s*\\[`);
		const bareName = new RegExp(`\\b${dbName}\\b`);
		return declaration.test(text) || bareName.test(text);
	}

	async function discoverDatabaseScripts() {
		log('正在檢查海豹表目前的資料庫腳本位置...');
		const html = await gmRequestText(SEAL_PAGE_URL, '海豹表頁面');
		const scriptUrls = extractScriptSources(html);
		log(`海豹表頁面找到 ${scriptUrls.length} 個同網域 JS。`);
		const selected = {HimeData: null, EidolonData: null, SoulData: null};
		//從 <script src> 的檔名直接判斷。
		for (const url of scriptUrls) {
			const fileName = getFileName(url).toLowerCase();
			for (const dbName of Object.keys(selected)) {
				if (!selected[dbName] && fileName.includes(dbName.toLowerCase())) {
					try {
						const scriptText = await gmRequestText(url, `${dbName} (${url})`);
						if (isLikelyDatabaseScript(scriptText, dbName)) {
							selected[dbName] = scriptText;
							log(`${dbName} 找到於 ${url}`);
						}
					} catch (error) {
						log(`${dbName} 直接載入失敗: ${error.message}`);
					}
				}
			}
		}
		return selected;
	}

	async function loadSealDatabases() {
		const databases = await discoverDatabaseScripts();
		const missing = Object.keys(databases).filter(name => !databases[name]);
		if (missing.length) {
			throw new Error(
				`找不到海豹表資料庫：${missing.join(', ')}。海豹表目前可能已更換資料檔位置，請查看 Console 的 [SealExport] 訊息。`
			);
		}
		return databases;
	}
	// 解析遠端資料庫腳本
	function getArrayFromScript(scriptText, varName) {
		if (typeof scriptText !== 'string' || !scriptText.trim()) {
			throw new Error(`${varName} 資料庫內容為空`);
		}
		const result = new Function(
			`${scriptText}\n; return ${varName};`
		)();
		if (!Array.isArray(result)) {
			throw new Error(`${varName} 不是有效的陣列資料`);
		}
		return result;
	}
	// 比對資料並產生 Seal URL
	function generateSealUrl(gameData, himeJs, eidolonJs, soulJs) {
		const HimeData = getArrayFromScript(himeJs, DATABASE_NAMES.HimeData);
		const EidolonData = getArrayFromScript(eidolonJs, DATABASE_NAMES.EidolonData);
		const SoulData = getArrayFromScript(soulJs, DATABASE_NAMES.SoulData);
		const groups = {hfi: [], hwa: [], hwi: [], hth: [], hli: [], hda: []};

		HimeData.forEach(item => {
			const id = String(item?.img_id || '');
			if (id.startsWith('fire')) {
				groups.hfi.push(item);
			} else if (id.startsWith('water')) {
				groups.hwa.push(item);
			} else if (id.startsWith('wind')) {
				groups.hwi.push(item);
			} else if (id.startsWith('thunder')) {
				groups.hth.push(item);
			} else if (id.startsWith('light')) {
				groups.hli.push(item);
			} else if (id.startsWith('dark')) {
				groups.hda.push(item);
			}
		});
		const toIdSet = ownedIdsArray => new Set(
			(Array.isArray(ownedIdsArray) ? ownedIdsArray : [])
				.map(Number)
				.filter(id => Number.isFinite(id) && id > 0)
		);
		const characterIds = toIdSet(gameData.characters);
		const summonIds = toIdSet(gameData.summons);
		const jobIds = toIdSet(gameData.jobs);
		// 狀態：0 = 未持有，1 = 基礎，2 = 覺醒，3 = 真化
		const generateStateString = (dataArray, ownedIds, idKey) => {
			return dataArray.map(item => {
				const baseId = Number(item?.[idKey]);
				const awakeId = Number(item?.awake);
				const makaId = Number(item?.maka);
				if (makaId > 0 && ownedIds.has(makaId)) {return '3';}
				if (awakeId > 0 && ownedIds.has(awakeId)) {return '2';}
				if (baseId > 0 && ownedIds.has(baseId)) {return '1';}
				return '0';
			}).join('');
		};
		const params = new URLSearchParams();
		params.set('hfi', generateStateString(groups.hfi, characterIds, 'hime_id'));
		params.set('hwa', generateStateString(groups.hwa, characterIds, 'hime_id'));
		params.set('hwi', generateStateString(groups.hwi, characterIds, 'hime_id'));
		params.set('hth', generateStateString(groups.hth, characterIds, 'hime_id'));
		params.set('hli', generateStateString(groups.hli, characterIds, 'hime_id'));
		params.set('hda', generateStateString(groups.hda, characterIds, 'hime_id'));
		const validEidolons = EidolonData.filter(item => item?.img_id);
		params.set('ei', generateStateString(validEidolons, summonIds, 'summon_id'));
		const validSouls = SoulData.filter(item => item?.img_id);
		params.set('so', generateStateString(validSouls, jobIds, 'job_id'));
		if (gameData?.player?.name) {params.set('un', String(gameData.player.name));}
		return `${SEAL_URL}?${params.toString()}`;
	}
	//Tampermonkey 選單
	GM_registerMenuCommand('匯出至海豹表', startExportProcess, {
		accessKey: 's'
	});
	log('Seal URL Generator 2.1 已載入。');
	log('操作方式：Tampermonkey 選單[匯出至海豹表]');
})();
