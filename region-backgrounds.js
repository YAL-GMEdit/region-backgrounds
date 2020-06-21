(function() {
	function DynMarker() {
		
	}
	DynMarker.prototype.$sync = function(session, rbd) {
		let n = session.getLength();
		rbd.lineCount = n;
		rbd.regions.length = 0;
		let stack = [];
		let curr = null;
		for (let row = 0; row < n; row++) {
			let line = session.getLine(row);
			let mt = /^\s*(?:\/\/)?#region(.*)$/.exec(line);
			if (mt) {
				mt = /^\s*\[(.+?)\]/.exec(mt[1]);
				stack.push(curr);
				if (mt) {
					curr = {
						range: new AceRange(row, 0, row, 0),
						startLine: line,
					};
					let s = mt[1];
					if (s.startsWith("#")) {
						curr.color = s;
					} else {
						curr.clazz = s;
					}
					rbd.regions.push(curr);
				} else {
					curr = 1;
				}
			} else if (/^\s*(?:\/\/)?#endregion/.test(line)) {
				if (curr && typeof(curr) === "object") {
					curr.range.end.row = row;
					curr.endLine = line;
				}
				curr = stack.pop();
			}
		}
	}
	DynMarker.prototype.update = function(html, markerLayer, session, config) {
		let rbd = session.regionBackgroundData;
		if (!rbd) {
			rbd = {
				lineCount: -1,
				regions: [],
				session: session,
				marker: this
			};
			session.regionBackgroundData = rbd;
		}
		//
		let wantSync = session.getLength() != rbd.lineCount;
		if (!wantSync) for (let reg of rbd.regions) {
			if (reg.startLine != session.getLine(reg.range.start.row)) {
				wantSync = true;
				break;
			}
		}
		if (wantSync) this.$sync(session, rbd);
		//
		for (let reg of rbd.regions) {
			let style = "position: absolute;";
			let range = reg.range.toScreenRange(session);
			let clazz = "region-background-" + (reg.clazz || "simple");
			if (reg.color) style += `background-color:${reg.color};`
			markerLayer.drawFullLineMarker(html, range, clazz, config, style);
		}
	};
	function init() {
		let createSessionBase = $gmedit["ace.AceTools"].createSession;
		$gmedit["ace.AceTools"].createSession = function() {
			let session = createSessionBase.apply(this, arguments);
			session.addDynamicMarker(new DynMarker());
			return session;
		}
		GMEdit.on("fileSave", (e) => {
			let session = e.file.editor.session;
			if (!session) return;
			let rbd = session.regionBackgroundData;
			if (rbd) {
				rbd.marker.$sync(session, rbd);
			}
		});
	}
	GMEdit.register("region-backgrounds", {
		init: init,
	});
})();