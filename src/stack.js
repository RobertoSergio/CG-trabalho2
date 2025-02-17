var 
		gl,
		prog,
		camera,
		camPos,
		camUp,
		camLookAt,
		canvas,
		ambient,
		diffuse,
		specular,
		lightPos,
		boxGeometry,
		mproj,
		stackPos = 1,
		affectedByPhysics,
		currentDir = "z";
		stack = [],
		angle = 0.0,
		moveRate = 1.0, 
		speed = 20
		points = 0;
		shouldContinueLoop = true
		aux=0;
;

stack.push([[0.0, 1.20,  0.0], [1.0, 1.0, 1.0], stackPos]);
stack.push([[0.0, 1.50, -3.0], [1.0, 1.0, 1.0], stackPos]);

const loadImage = path => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.crossOrigin = 'Anonymous' // to avoid CORS if used with Canvas
    img.src = path
    
    img.onload = () => {
      resolve(img)
    }
    
    img.onerror = e => {
      reject(e)
    }
  })
}

window.addEventListener('keydown', function(event) {
	// ...
	if (event.key === ' ' && moveRate != 0) {
	  // affectedByPhysics = true;
	  // moveRate = 0;
	  camPos[1] += 0.33;
	  camLookAt[1] += 0.33;
	  camUp[1] += 0.33;
  
	  const topp = stack[stack.length - 1];
  
	  stackPos++;
  
	  if (stackPos % 2 == 0) {
		speed -= 0.5;
		speed = math.max(speed, 1);
	  }
  
	  if (currentDir === "z") {
		stack.push([[-3.0, topp[0][1] + 0.33,  0.0], [topp[1][0], topp[1][1], topp[1][2]/* * 0.9*/], stackPos]);
		currentDir = "x";
	  } else if (currentDir === "x") {
		stack.push([[ 0.0, topp[0][1] + 0.33, -3.0], [topp[1][0]/* * 0.9*/, topp[1][1], topp[1][2]], stackPos]);
		currentDir = "z";
	  }
	  stack = stack.slice(-10);
  	  if (stack.length >= 2) {
		var ultimoQuadrado = stack[stack.length - 1];
		var penultimoQuadrado = stack[stack.length - 2];
		shouldContinueLoop = checkCollision(ultimoQuadrado, penultimoQuadrado);
	  }
	  configCam();
	} else if (event.key === ' ' && moveRate == 0) {
	  moveRate = 1;
	  affectedByPhysics = false;
	}
  });

function resizeCanvas() {
  const canvas = document.getElementById('glcanvas');
  
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width;
  canvas.height = height;

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	
	mproj = createPerspective(20, gl.canvas.width / gl.canvas.height, 0.1, 1e4);

	const u_viewportDimensions = gl.getUniformLocation(prog, "u_viewportDimensions");
	gl.uniform2f(u_viewportDimensions, width, height);
}

function setup() {
	affectedByPhysics = false;

	canvas = document.getElementById("glcanvas");
	gl = getGL(canvas);

	if (gl) {
		const vtxshSource = loadSource("src/vtxsh.glsl");
		const fragshSource = loadSource("src/fragsh.glsl");

		const vtxsh = createShader(gl, gl.VERTEX_SHADER, vtxshSource);
		const fragsh = createShader(gl, gl.FRAGMENT_SHADER, fragshSource);

		prog = createProgram(gl, vtxsh, fragsh);

		gl.useProgram(prog);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		
		gl.clearColor(0.8705883, 0.3647059, 0.5137255, 1.0);
		
		gl.enable(gl.BLEND);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
		configScene();
		
	} else {
		console.error("Error loading WebGL context");
	
	}
	

}

function resetCam() {
	camPos = [7.0, 6.0, 8.0];
	camLookAt = [0.0, 2.0, 0.0];
	camUp = [camPos[0], camPos[1] + 1, camPos[2]];

	configCam();
}

function configCam() {
	camera = createCamera(camPos, camLookAt, camUp);
}

async function configScene() {
	// resizeCanvas();
	resetCam();

	lightPos = [0.0, 0.0, 0.0];

	ambient = {
		color: [1.0, 1.0, 1.0]
	};

	diffuse = {
		color: [1.0, 1.0, 1.0],
		direction: [-1.0, -1.0, -1.0]
	};

	specular = {
		color: [1.0, 1.0, 1.0] /*[0.6549019608, 0.7803921569, 0.9058823529]*/ /*[0.0, 1.0, 1.0]*/,
		position: lightPos,
		shininess: 50
	};

	mproj = createPerspective(20, gl.canvas.width / gl.canvas.height, 0.1, 1e4);

	const u_ambientColor = gl.getUniformLocation(prog, "u_ambientColor");
	gl.uniform3fv(u_ambientColor, ambient.color);

	const u_diffuseColor = gl.getUniformLocation(prog, "u_diffuseColor");
	gl.uniform3fv(u_diffuseColor, diffuse.color);	

	const u_specularColor = gl.getUniformLocation(prog, "u_specularColor");
	gl.uniform3fv(u_specularColor, specular.color);
	
	const u_lightPosition = gl.getUniformLocation(prog, "u_lightPosition");
	gl.uniform3fv(u_lightPosition, specular.position);
	
	const u_lightDirection = gl.getUniformLocation(prog, "u_lightDirection");
	gl.uniform3fv(u_lightDirection, diffuse.direction);
	
	const u_shininess = gl.getUniformLocation(prog, "u_shininess");
	gl.uniform1f(u_shininess, specular.shininess);
	
	boxGeometry = await load3DObject("/models/flat_box.obj");

	initTexture();
	loop();
}

function draw3DObject(object, info) {
	const u_stackPos = gl.getUniformLocation(prog, "u_stackPos");
	gl.uniform1f(u_stackPos, info[2] / 50.0);

	const u_lightPosition = gl.getUniformLocation(prog, "u_lightPosition");
	gl.uniform3fv(u_lightPosition, specular.position);

	const u_invTranspModelMatrix = gl.getUniformLocation(prog, "u_invTranspModelMatrix");
	const u_MVPMatrix = gl.getUniformLocation(prog, "u_MVPMatrix");

	const pivot = object.vertices.slice(0, 3);
	const pivotMatrix = translate(-pivot[0], -pivot[1], -pivot[2]);
	
	const pos = info[0];
	const scalef = info[1];

	const translation = translate(pos[0], pos[1], pos[2]);
	const scaling = math.multiply(pivotMatrix, scale(scalef[0], scalef[1], scalef[2]), math.inv(pivotMatrix));

	const modelMatrix = math.multiply(translation, scaling);
	
	// Aqui só enviamos invertida pois o OpenGL já interpreta como transposta
	gl.uniformMatrix4fv(u_invTranspModelMatrix, gl.FALSE, math.flatten(math.inv(modelMatrix)).toArray());

	var MVPMatrix = math.multiply(mproj, camera, modelMatrix);

	gl.uniformMatrix4fv(u_MVPMatrix, gl.FALSE, math.flatten(math.transpose(MVPMatrix)).toArray());
	// Bind normals buffer
	var normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, object.normals, gl.STATIC_DRAW);

	// Bind texture coordinates buffer
	var texCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, object.texCoords, gl.STATIC_DRAW);

	// Bind vertex buffer
	var vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, object.vertices, gl.STATIC_DRAW);

	// Bind index buffer
	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, object.indices, gl.STATIC_DRAW);

	var a_position = gl.getAttribLocation(prog, "a_position");
	gl.enableVertexAttribArray(a_position);
	gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);

	var a_texCoord = gl.getAttribLocation(prog, "a_texCoord");
	gl.enableVertexAttribArray(a_texCoord);
	gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);

	var a_normal = gl.getAttribLocation(prog, "a_normal");
	gl.enableVertexAttribArray(a_normal);
	gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 0, 0);

	gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);

	gl.deleteBuffer(normalBuffer);
	gl.deleteBuffer(indexBuffer);
	gl.deleteBuffer(vertexBuffer);
	gl.deleteBuffer(texCoordBuffer);
}


async function initTexture() {
	try {
		var texture = await loadImage("res/7.jpg");
	
	} catch(e) {
		console.error(e);
		return;
	}
	
	const tex = gl.createTexture();

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, tex);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
	
	const texPtr = gl.getUniformLocation(prog, "u_tex");
	gl.uniform1i(texPtr, 0);
}

function loop() {
	var pointsDisplay = document.getElementById('pointsDisplay');
	pointsDisplay.textContent = points;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	var top = stack[stack.length - 1];
  
	if (currentDir === "z") {
	  top[0][2] += moveRate / speed;
  
	  if (Math.abs(top[0][2]) >= 3.1) {
		moveRate *= -1;
	  }
  
	} else if (currentDir === "x") {
	  top[0][0] += moveRate / speed;
  
	  if (Math.abs(top[0][0]) >= 3.1) {
		moveRate *= -1;
	  }
	}
  
	specular.position = [top[0][0], top[0][1] + 1.0, top[0][2]];
  
	for (var i = 0; i < stack.length; i++) {
	  draw3DObject(boxGeometry, stack[i]);
	}
  
	configCam();
	
	if (!shouldContinueLoop) {
		return; // Interrompe a função loop sem chamar requestAnimationFrame
	}
  
	animationId = requestAnimationFrame(loop);
}

function checkCollision(obj1, obj2) {
	var pos1 = obj1[0];
	var scale1 = obj1[1];
	var pos2 = obj2[0];
	var scale2 = obj2[1];
	// console.log(pos1)
	// console.log(scale1)
	// console.log(pos2)
	// console.log(scale2)
	// limites do obj1
	var obj1MinX = pos1[0] - scale1[0] / 2;
	var obj1MaxX = pos1[0] + scale1[0] / 2;
	var obj1MinY = pos1[1] - scale1[1] / 2;
	var obj1MaxY = pos1[1] + scale1[1] / 2;
	var obj1MinZ = pos1[2] - scale1[2] / 2;
	var obj1MaxZ = pos1[2] + scale1[2] / 2;

	// limites do obj2 
	var obj2MinX = pos2[0] - scale2[0] / 2;
	var obj2MaxX = pos2[0] + scale2[0] / 2;
	var obj2MinY = pos2[1] - scale2[1] / 2;
	var obj2MaxY = pos2[1] + scale2[1] / 2;
	var obj2MinZ = pos2[2] - scale2[2] / 2;
	var obj2MaxZ = pos2[2] + scale2[2] / 2;
  
	// Verificar se há sobreposição nos eixos X e Z
	var overlapX = obj1MinX <= obj2MaxX-0.1 && obj1MaxX-0.1 >= obj2MinX;
	//var overlapY = obj1MinY <= obj2MaxY && obj1MaxY >= obj2MinY;
	var overlapZ = obj1MinZ <= obj2MaxZ-0.1 && obj1MaxZ-0.1 >= obj2MinZ;

	if (overlapX  || overlapZ) {
	  console.log("Colisão detectada!");
	  points = points +1;
	  Diminuir_escala(obj1,obj2);
	  //CortarObjetos(obj1 , obj2)
	  return true;
	} else {
	  console.log("Sem colisão.");
	  return false;
	}
}
function Diminuir_escala(obj1,obj2){
	var scale1 = obj1[1];
	var scale2 = obj1[1];
	// Reduzir a escala em 5%
    scale1[0] *= 0.98;
    scale1[2] *= 0.98;
    scale2[0] *= 0.98;
    scale2[2] *= 0.98;
	console.log(scale1[0],
		scale1[1],
		scale1[2],
		scale2[0],
		scale2[1],
		scale2[2]);
	stack[stack.length - 1][1]=[scale1[0],scale1[1],scale1[2]];
	stack[stack.length - 2][1]=[scale2[0],scale2[1],scale2[2]];
}
function CortarObjects2(obj1,obj2){
		var pos1 = obj1[0];
		var scale1 = obj1[1];
		var pos2 = obj2[0];
		var scale2 = obj2[1];
		// console.log(pos1)
		// console.log(scale1)
		// console.log(pos2)
		// console.log(scale2)
		// limites do obj1
		var obj1MinX = pos1[0] - scale1[0] / 2;
		var obj1MaxX = pos1[0] + scale1[0] / 2;
		var obj1MinY = pos1[1] - scale1[1] / 2;
		var obj1MaxY = pos1[1] + scale1[1] / 2;
		var obj1MinZ = pos1[2] - scale1[2] / 2;
		var obj1MaxZ = pos1[2] + scale1[2] / 2;

		// limites do obj2 
		var obj2MinX = pos2[0] - scale2[0] / 2;
		var obj2MaxX = pos2[0] + scale2[0] / 2;
		var obj2MinY = pos2[1] - scale2[1] / 2;
		var obj2MaxY = pos2[1] + scale2[1] / 2;
		var obj2MinZ = pos2[2] - scale2[2] / 2;
		var obj2MaxZ = pos2[2] + scale2[2] / 2;
	
		// Verificar se há sobreposição nos eixos X e Z
		var overlapX = obj1MinX <= obj2MaxX-0.1 && obj1MaxX-0.1 >= obj2MinX;
		//var overlapY = obj1MinY <= obj2MaxY && obj1MaxY >= obj2MinY;
		var overlapZ = obj1MinZ <= obj2MaxZ-0.1 && obj1MaxZ-0.1 >= obj2MinZ;
	// Calcular pontos de interseção
	   var intersectMinX = Math.max(obj1MinX, obj2MinX);
	   var intersectMaxX = Math.min(obj1MaxX, obj2MaxX);
	   var intersectMinZ = Math.max(obj1MinZ, obj2MinZ);
	   var intersectMaxZ = Math.min(obj1MaxZ, obj2MaxZ);

	   // Criar novos objetos a partir dos pontos de interseção
	   var newObj1Pos, newObj1Scale, newObj2Pos, newObj2Scale;

	   if (currentDir === "x") {
		   newObj1Pos = [(intersectMinX + intersectMaxX) / 2, pos1[1], pos1[2]];
		   newObj1Scale = [intersectMaxX - intersectMinX, scale1[1], scale1[2]];
		   newObj2Pos = [(intersectMinX + intersectMaxX) / 2, pos2[1], pos2[2]];
		   newObj2Scale = [intersectMaxX - intersectMinX, scale2[1], scale2[2]];
	   } else if (currentDir === "z") {
		   newObj1Pos = [pos1[0], pos1[1], (intersectMinZ + intersectMaxZ) / 2];
		   newObj1Scale = [scale1[0], scale1[1], intersectMaxZ - intersectMinZ];
		   newObj2Pos = [pos2[0], pos2[1], (intersectMinZ + intersectMaxZ) / 2];
		   newObj2Scale = [scale2[0], scale2[1], intersectMaxZ - intersectMinZ];
	   }

	   // Atualizar a pilha de objetos com os novos objetos
	   //stack[stack.length - 1][0]=newObj1Pos;
	   stack[stack.length - 1][1]=newObj1Scale;
	   //stack[stack.length - 2][0]=newObj2Pos;
	   stack[stack.length - 2][1]=newObj2Scale;
	   //stack.push([newObj1Pos, newObj1Scale]);
	   //stack.push([newObj2Pos, newObj2Scale]);
	   console.log(stack[stack.length - 1][0]);
	   console.log(newObj1Scale);
	   console.log(stack[stack.length - 2][0]);
}

function CortarObjetos(obj1, obj2) {
	var overlappingScales = findOverlappingScales(obj1, obj2);
	
	var overlappingScaleX = overlappingScales[0];
	var overlappingScaleY = overlappingScales[1];
	var overlappingScaleZ = overlappingScales[2];
  
	stack[stack.length - 1][1] = [overlappingScaleX, overlappingScaleY, overlappingScaleZ];
	stack[stack.length - 2][1] = [overlappingScaleX, overlappingScaleY, overlappingScaleZ];
	stack[0][1] = [overlappingScaleX, overlappingScaleY, overlappingScaleZ];
}

function findOverlappingScales(obj1, obj2) {
	var pos1 = obj1[0].slice();
	var scale1 = obj1[1].slice();
	var pos2 = obj2[0].slice();
	var scale2 = obj2[1].slice();
	
	var minX1 = pos1[0] - scale1[0] / 2;
	var maxX1 = pos1[0] + scale1[0] / 2;
	var minY1 = pos1[1] - scale1[1] / 2;
	var maxY1 = pos1[1] + scale1[1] / 2;
	var minZ1 = pos1[2] - scale1[2] / 2;
	var maxZ1 = pos1[2] + scale1[2] / 2;
  
	var minX2 = pos2[0] - scale2[0] / 2;
	var maxX2 = pos2[0] + scale2[0] / 2;
	var minY2 = pos2[1] - scale2[1] / 2;
	var maxY2 = pos2[1] + scale2[1] / 2;
	var minZ2 = pos2[2] - scale2[2] / 2;
	var maxZ2 = pos2[2] + scale2[2] / 2;
  
	var overlappingMinX = Math.max(minX1, minX2);
	var overlappingMaxX = Math.min(maxX1, maxX2);
	var overlappingMinY = Math.max(minY1, minY2);
	var overlappingMaxY = Math.min(maxY1, maxY2);
	var overlappingMinZ = Math.max(minZ1, minZ2);
	var overlappingMaxZ = Math.min(maxZ1, maxZ2);

	//console.log(overlappingMinX);
	//console.log(overlappingMaxX);
	//console.log(overlappingMinZ);
	//console.log(overlappingMaxZ);
	// talvez o calculo da nova escala esteja sendo feita de forma errada ? não sei..... tnc
	// sinceramente acho que isso aqui ta tudo errado :) 
	var overlappingScaleX = overlappingMaxX - overlappingMinX
	var overlappingScaleY = overlappingMaxY - overlappingMinY;
	var overlappingScaleZ = overlappingMaxZ - overlappingMinZ;

	return [overlappingScaleX, overlappingScaleY, overlappingScaleZ];
}
// tentei usar os vertices para ver se tinha colisão ou não, nã funcionou . Tentei de outra forma,
// mas deixei a função aqui pra qualquer coisa
function calcularVertices(obj) {
	var position = obj[0];
	var scale = obj[1];
  
	var posX = position[0];
	var posY = position[1];
	var posZ = position[2];
  
	var scaleX = scale[0];
	var scaleY = scale[1];
	var scaleZ = scale[2];
  
	var vertices = [];
  
	vertices.push([posX - scaleX / 2, posY - scaleY / 2, posZ - scaleZ / 2]); // Vértice 0
	vertices.push([posX + scaleX / 2, posY - scaleY / 2, posZ - scaleZ / 2]); // Vértice 1
	vertices.push([posX + scaleX / 2, posY + scaleY / 2, posZ - scaleZ / 2]); // Vértice 2
	vertices.push([posX - scaleX / 2, posY + scaleY / 2, posZ - scaleZ / 2]); // Vértice 3
	vertices.push([posX - scaleX / 2, posY - scaleY / 2, posZ + scaleZ / 2]); // Vértice 4
	vertices.push([posX + scaleX / 2, posY - scaleY / 2, posZ + scaleZ / 2]); // Vértice 5
	vertices.push([posX + scaleX / 2, posY + scaleY / 2, posZ + scaleZ / 2]); // Vértice 6
	vertices.push([posX - scaleX / 2, posY + scaleY / 2, posZ + scaleZ / 2]); // Vértice 7
  
	return vertices;
}
