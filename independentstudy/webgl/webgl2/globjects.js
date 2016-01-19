var gl;
var shaderProgram;
var textures = [];
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();
var positionBuffers = [];
var normalBuffers = [];
var textureCoordBuffers = [];
var indexBuffers = [];
var colors = [];
var lastTime = 0;
var canvas;

function initGL() {
	try {
		gl = canvas.getContext("webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {}
	
	if (!gl) {
		alert("Could not initialize WebGL.");
	}
}

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}
	
	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}
	
	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}
	
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	
	return shader;
}

function initShaders() {
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");
	
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialize shaders.");
	}
	
	gl.useProgram(shaderProgram);
	
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
	
	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
	
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
	shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
	shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
	shaderProgram.pointLightingColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingColor");
	shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");
	shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "color");
}

function handleLoadedTexture(texture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

function initTextures() {
	for (var i = 0; i < textures.length; i++) {
		textures[i] = gl.createTexture();
		textures[i].image = new Image();
		textures[i].image.onload = function() {
			handleLoadedTexture(textures[i]);
		};
		textures[i].image.src = "" + i + ".gif";
	}
}

function mvPushMatrix() {
	var copy = mat4.create();
	mat4.copy(copy, mvMatrix);
	mvMatrixStack.push(copy);
}

function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
		throw "Invalid popMatrix";
	}
	mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	
	var normalMatrix = mat3.create();
	mat3.normalFromMat4(normalMatrix, mvMatrix);
	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function initModelBuffers(model, index, x, y, z) {
	addTableRow(index, x, y, z, true);
	
	positionBuffers[index] = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[index]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertexPositions), gl.STATIC_DRAW);
	positionBuffers[index].itemSize = 3;
	positionBuffers[index].numItems = model.vertexPositions.length / 3;
	
	normalBuffers[index] = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[index]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertexNormals), gl.STATIC_DRAW);
	normalBuffers[index].itemSize = 3;
	normalBuffers[index].numItems = model.vertexNormals.length / 3;
	
	textureCoordBuffers[index] = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffers[index]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertexTextureCoords), gl.STATIC_DRAW);
	textureCoordBuffers[index].itemSize = 2;
	textureCoordBuffers[index].numItems = model.vertexTextureCoords.length / 2;
	
	indexBuffers[index] = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers[index]);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), STATIC_DRAW);
	indexBuffers[index].itemSize = 1;
	indexBuffers[index].numItems = model.indices.length;
	
	var colorArray = [Math.random(), Math.random(), Math.random(), 1.0];
	colors[index] = colorArray;
}

function loadObject(file, index, x, y, z) {
	var request = new XMLHttpRequest();
	request.open("GET", file);
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			initModelBuffers(JSON.parse(request.responseText), index, x, y, z);
		}
	};
	request.send();
}

function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	mat4.perspective(pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
	
	var lighting = document.getElementById("lighting").checked;
	gl.uniform1i(shaderProgram.useLightingUniform, lighting);
	if (lighting) {
		gl.uniform3f(
			shaderProgram.ambientColorUniform,
			parseFloat(document.getElementById("ambientR").value),
			parseFloat(document.getElementById("ambientG").value),
			parseFloat(document.getElementById("ambientB").value)
		);
		
		gl.uniform3f(
			shaderProgram.pointLightingLocationUniform,
            parseFloat(document.getElementById("lightPositionX").value),
            parseFloat(document.getElementById("lightPositionY").value),
            parseFloat(document.getElementById("lightPositionZ").value)
		);
		
		gl.uniform3f(
			shaderProgram.pointLightingColorUniform,
            parseFloat(document.getElementById("pointR").value),
            parseFloat(document.getElementById("pointG").value),
            parseFloat(document.getElementById("pointB").value)
		);
	}
	
	gl.uniform1i(shaderProgram.useTexturesUniform, false);
	
	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, mvMatrix, [0, 0, -16]);
	
	for (var i = positionBuffers.length - 1; i > 0; i--) {
		drawObj(i);
		mvPopMatrix();
	}
	if (positionBuffers.length > 0) {
		drawObj(0);
	}
}

function drawObj(index) {
	mvPushMatrix();
	mat4.rotate(mvMatrix, mvMatrix, 0, [0, 1, 0]);
	mat4.translate(mvMatrix, mvMatrix, [5, 0, 0]);
	
	gl.uniform4f(
		shaderProgram.colorUniform,
		colors[index][0],
		colors[index][1],
		colors[index][2],
		colors[index][3]
	);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[index]);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, positionBuffers[index].itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[index]);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, normalBuffers[index].itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffers[index]);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, textureCoordBuffers[index].itemSize, gl.FLOAT, false, 0, 0);
	
	gl.uniform1i(shaderProgram.samplerUniform, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers[index]);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, indexBuffers[index].numItems, gl.UNSIGNED_SHORT, 0);
}

function animate() {
	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		var elapsed = timeNow - lastTime;
	}
	lastTime = timeNow;
}

function tick() {
	requestAnimFrame(tick);
	drawScene();
	animate();
}

function start() {
	canvas = document.getElementById("glcanvas");
	canvas.addEventListener("mousedown", mouseClick, false);
	canvas.addEventListener("contextmenu", function(e) {
		e.preventDefault();
		return false;
	}, false);
	initGL();
	initShaders();
	initTextures();
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	
	tick();
}

function mouseClick(event) {
	var coords = canvas.mouseCoords(event);
	var x = coords.x;
	var y = coords.y;
	
	var w = canvas.width;
	var h = canvas.height;
	
	x *= 20.0;
	x /= w;
	x -= 15.0;
	
	y *= -15.0;
	y /= h;
	y += 7.5;
	
	var z = 0;
	
	if (event.button === 2) {
		loadObject("sphere.json", positionBuffers.length, x, y, z);
	} else {
		loadObject("cube.json", positionBuffers.length, x, y, z);
	}
}

function mouseCoords(event) {
	var rect = this.getBoundingClientRect();
    var cx = event.clientX - rect.left;
    var cy = event.clientY - rect.top;
	return {x:cx, y:cy}
}
HTMLCanvasElement.prototype.mouseCoords = mouseCoords;

function addTableRow(index, x, y, z, cube) {
	var table = document.getElementById("objects");
	var row = document.createElement("tr");
	row.setAttribute("id", "o" + index);
	var name = document.createElement("td");
	var b = document.createElement("b");
	b.setAttribute("id", "b" + index);
	if (cube) {
		b.appendChild(document.createTextNode("Cube (" + index + ")"));
	} else {
		b.appendChild(document.createTextNode("Sphere (" + index + ")"));
	}
	name.appendChild(b);
	row.appendChild(name);
	var elX = document.createElement("td");
	elX.appendChild(document.createTextNode("[X: " + x + "]"));
	var elY = document.createElement("td");
	elY.appendChild(document.createTextNode("[Y: " + y + "]"));
	var elZ = document.createElement("td");
	elZ.appendChild(document.createTextNode("[Z: " + z + "]"));
	row.appendChild(elX);
	row.appendChild(elY);
	row.appendChild(elZ);
	var del = document.createElement("input");
	del.setAttribute("type", "button");
	del.setAttribute("onclick", "delObj(" + index + ")");
	del.setAttribute("value", "Delete Object");
	del.setAttribute("id", "del" + index);
	row.appendChild(del);
	table.appendChild(row);
}

function delObj(index) {
	positionBuffers.splice(index, 1);
	normalBuffers.splice(index, 1);
	textureCoordBuffers.splice(index, 1);
	indexBuffers.splice(index, 1);
	var parent = document.getElementById("objects");
	var child = document.getElementById("o" + index);
	parent.removeChild(child);
	
	for (var i = index; i < positionBuffers.length; i++) {
		var row = document.getElementById("o" + (i + 1));
		row.setAttribute("id", "o" + i);
		var b = document.getElementById("b" + (i + 1));
		b.setAttribute("id", "b" + i);
		var txt;
		if (b.innerText.indexOf("Cube") !== -1) {
			txt = document.createTextNode("Cube (" + i + ")");
		} else {
			txt = document.createTextNode("Sphere (" + i + ")");
		}
		b.innerText = txt.textContent;
		var del = document.getElementById("del" + (i + 1));
		del.setAttribute("id", "del" + i);
		del.setAttribute("onclick", "delObj(" + i + ")");
	}
}