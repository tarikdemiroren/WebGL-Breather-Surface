

document.addEventListener("DOMContentLoaded", function () {

    // Variables to track the initial mouse position
let startMouseX = 0;
let startMouseY = 0;

// Variables to track the accumulated rotation angles
let totalRotationX = 0;
let totalRotationY = 0;

var isMouseDown = false;

// Event handlers
function onMouseDown(event) {
    isMouseDown = true;

    startMouseX = event.clientX;
    startMouseY = event.clientY;
}

function onMouseMove(event) {

    if(isMouseDown) {
        const deltaX = event.clientX - canvas.getBoundingClientRect().left - startMouseX;
        const deltaY = event.clientY - canvas.getBoundingClientRect().top - startMouseY;
    
        // Sensitivity factor to control rotation speed
        const sensitivity = 0.2;
    
        // Calculate rotation angles
        const rotationX = -deltaY * sensitivity;
        const rotationY = -deltaX * sensitivity;
    
        // Update total rotation angles
        totalRotationX = rotationX;
        totalRotationY = rotationY;

        console.log(totalRotationX, totalRotationY);
    }
}

function onMouseUp(event) {
    isMouseDown = false;
    totalRotationX = 0;
    totalRotationY = 0;
}

// Attach event listeners
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', onMouseUp);

    let uRangeStart;
    let uRangeEnd;
    let vRangeStart;
    let vRangeEnd;

    let changed = false;

    let uRange = [0, 16];
    let vRange = [0, 23];
    let uPrecision = 0.2;
    let vPrecision = 0.2;
    let aa = 0.5;

    document.getElementById("button").addEventListener("click", getNumbers);

    const uPrecisionValueSpan = document.getElementById('uPrecisionValue');
    uPrecisionValueSpan.textContent = `${uPrecision}`;

    document.getElementById("uPrecision").addEventListener("input", function () {
        uPrecision = this.value;
        uPrecisionValueSpan.textContent = `${uPrecision}`;
        changed = true;
    });


    const vPrecisionValueSpan = document.getElementById('vPrecisionValue');
    vPrecisionValueSpan.textContent = `${vPrecision}`;

    document.getElementById("vPrecision").addEventListener("input", function () {
        vPrecision = this.value;
        vPrecisionValueSpan.textContent = `${vPrecision}`;
        changed = true;
    });

    const aaPrecisionValueSpan = document.getElementById('aaPrecisionValue');
    aaPrecisionValueSpan.textContent = `${aa}`;

    document.getElementById("aaValue").addEventListener("input", function () {
        aa = this.value;
        aaPrecisionValueSpan.textContent = `${aa}`;
        changed = true;
    });

    function getNumbers() {
        const uRangeStartInput = document.getElementById("uRangeStart").value;
        const uRangeEndInput = document.getElementById("uRangeEnd").value;
        const vRangeStartInput = document.getElementById("vRangeStart").value;
        const vRangeEndInput = document.getElementById("vRangeEnd").value;

        uRangeStart = parseInt(uRangeStartInput);
        uRangeEnd = parseInt(uRangeEndInput);
        vRangeStart = parseInt(vRangeStartInput);
        vRangeEnd = parseInt(vRangeEndInput);

        uRange = [uRangeStart, uRangeEnd];
        vRange = [vRangeStart, vRangeEnd];

        changed = true;
    }

    var zoomCoefficient = 600;

    document.getElementById("buttonIn").addEventListener("click", function () {
        zoomCoefficient -= 10;
    });

    document.getElementById("buttonOut").addEventListener("click", function () {
        zoomCoefficient += 10;
    });

    const canvas = document.getElementById("webgl-canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }

    var length_of_strip;

    // Vertex and fragment shader source code
    const vertexShaderSource = `
        attribute vec4 a_position;
        uniform mat4 u_matrix;
        void main() {
            gl_Position = u_matrix * a_position;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        void main() {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
        }
    `;

    // Compile shaders
    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Link shaders into a program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
        return;
    }

    gl.useProgram(program);

    // Create buffer and set vertices based on the parametrization
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    function quad(pointsArray, a, b, c, d) {
        var t1 = subtract(b, a);
        var t2 = subtract(c, b);
        var normal = cross(t1, t2);
        var normal = vec3(normal);
      
        pointsArray.push(a);
        // normalsArray.push(normal);
        pointsArray.push(b);
        // normalsArray.push(normal);
        pointsArray.push(c);
        // normalsArray.push(normal);
        pointsArray.push(d);
        // normalsArray.push(normal);
      }

    function createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa) {
        // Create an empty array to store the vertices.
        const verticesBreathable1 = [];
        const verticesBreathable2 = [];

        const totalVertices = [];
        var chose = 1;

        for (let u = uRange[0]; u <= uRange[1]; u += uPrecision) {
            for (let v = vRange[0]; v <= vRange[1]; v += vPrecision) {
                const wsqr = 1 - aa * aa;
                const w = Math.sqrt(wsqr);
                const denom = aa * (Math.pow(w * Math.cosh(aa * u), 2) + Math.pow(aa * Math.sin(w * v), 2));

                const x = -u + (2 * wsqr * Math.cosh(aa * u) * Math.sinh(aa * u) / denom);
                const y = 2 * w * Math.cosh(aa * u) * (-(w * Math.cos(v) * Math.cos(w * v)) - (Math.sin(v) * Math.sin(w * v))) / denom;
                const z = 2 * w * Math.cosh(aa * u) * (-(w * Math.sin(v) * Math.cos(w * v)) + (Math.cos(v) * Math.sin(w * v))) / denom;

                if (chose % 3 == 1){
                    verticesBreathable1.push(vec4(x, y, z, 1.0));
                }
                else if (chose % 3 == 2){
                    verticesBreathable2.push(vec4(x, y, z, 1.0));
                }
            }
            chose++;
            if (chose % 3 == 0){
                u -= vPrecision;
                if (length_of_strip === undefined){
                    length_of_strip = verticesBreathable1.length;
                }
                // else if (u != uRange[1] - uPrecision) {
                //     u -= vPrecision;
                //     // for (var j = 0; j < length_of_strip; j++){
                //     //     var k = verticesBreathable1[j];
                //     //     var l = totalVertices[ (totalVertices.length - (2*length_of_strip)) + j + (j + 1) ]
                //     //     totalVertices.push(k);
                //     //     totalVertices.push(l);
                //     // }
                // }
                for (var i = 0; i < verticesBreathable1.length; i++){
                    var a = verticesBreathable1.shift();
                    var b = verticesBreathable2.shift();
                    totalVertices.push( a );
                    totalVertices.push( b );
                }
                chose++;
            }
        }
        length_of_strip = undefined;

        return totalVertices;
    }

    let vertices = createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa);

    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Get attribute location and enable it
    const positionAttribLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(positionAttribLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.enable(gl.DEPTH_TEST);

    // Set up the perspective matrix
    var projectionMatrix = mat4();
    projectionMatrix = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 10000);

    // Set up the model-view matrix
    var modelViewMatrix = mat4();
    modelViewMatrix = lookAt(vec3(0, 0, -(zoomCoefficient)), vec3(0, 0, 0), vec3(0, 1, 0));

    var matrix = mat4();
    matrix = mult(projectionMatrix, modelViewMatrix);

    // Set up the perspective matrix
    var matrixLocation = gl.getUniformLocation(program, "u_matrix");

    gl.uniformMatrix4fv(matrixLocation, false, flatten(matrix));

    render();

    function render() {
        // Set the WebGL rendering context clear color
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT);

        // console.log(`uRange: ${uRange} vRange: ${vRange}, uPrecision: ${uPrecision} vPrecision: ${vPrecision} aa: ${aa}`);

        if (changed) {
            vertices = structuredClone(createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa));
            gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
        }

        // modelViewMatrix = mult(modelViewMatrix, rotate(totalRotationX * (Math.PI / 180), [1, 0, 0]));

        modelViewMatrix[2][3] = -(zoomCoefficient);
        modelViewMatrix = mult(modelViewMatrix, rotate(totalRotationY * (Math.PI / 180), [0, 1, 0]));

        matrix = mult(projectionMatrix, modelViewMatrix);

        matrixLocation = gl.getUniformLocation(program, "u_matrix");
        gl.uniformMatrix4fv(matrixLocation, false, flatten(matrix));

        changed = false;
        gl.drawArrays(gl.LINES, 0, vertices.length );
        requestAnimationFrame(render)
    }
});