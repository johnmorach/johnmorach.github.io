var container;
var camera, scene, renderer;
var geometry;
var mesh;

function init() {
	dcanvas = document.getElementById("canvas");
	
	camera = new THREE.PerspectiveCamera(27, 640 / 480, 5, 3500);
	camera.position.z = 2750;
	scene = new THREE.Scene();
	var particles = 5000;
	geometry = new THREE.Geometry();
	var n = 1000, n2 = n / 2;
	
	for (var i = 0; i < particles; i++) {
		var x = Math.random() * n - n2;
		var y = Math.random() * n - n2;
		var z = 0;
		
		var vx = (x / n) + 0.5;
		var vy = (y / n) + 0.5;

		var color = new THREE.Color();
		color.setRGB(vx, vy, vx * vy);
		
		geometry.vertices.push(new THREE.Vector3(x, y, z));
		geometry.colors.push(color);
	}
	
	geometry.computeBoundingSphere();
	
	var material = new THREE.PointsMaterial({size: 15, vertexColors: THREE.VertexColors});
	
	particleSystem = new THREE.Points(geometry, material);
	scene.add(particleSystem);
	
	renderer = new THREE.WebGLRenderer({antialias: false, canvas: dcanvas});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(640, 480);
	
	animate();
}

function animate() {
	requestAnimationFrame(animate);
	render();
}

function render() {
	var time = Date.now() * 0.001;
	
	for (var i = 0; i < geometry.vertices.length; i++) {
		var vec = geometry.vertices[i];
		vec.setZ(50 * Math.cos(time + 0.01 * vec.x) * Math.sin(time + 0.01 * vec.y));
	}
	// Updating vertices every frame - should be optimized
	geometry.verticesNeedUpdate = true;
	
	particleSystem.rotation.x = time * 0.2;
	particleSystem.rotation.y = time * 0.1;
	
	renderer.render(scene, camera);
}