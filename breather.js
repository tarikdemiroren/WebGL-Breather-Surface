function initShaders(gl) {
    const vertexShaderSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uTime;
    varying vec3 vNormal;

    void main(void) {
        gl_Position = aVertexPosition;
    }

    // void main(void) {
    //     // Create a breathing effect using a sine function
    //     float amplitude = 0.5; // Adjust the amplitude as needed
    //     float frequency = 2.0; // Adjust the frequency as needed
    //     float displacement = amplitude * sin(uTime * frequency);

    //     // Displace the vertex along the normal direction
    //     vec4 displacedPosition = aVertexPosition + vec4(aVertexNormal * displacement, 0.0);

    //     // Transform the vertex position
    //     gl_Position = uProjectionMatrix * uModelViewMatrix * displacedPosition;

    //     // Pass the normal to the fragment shader for lighting calculations
    //     vNormal = mat3(uModelViewMatrix) * aVertexNormal;
    // }
    `;
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vNormal;

    void main(void) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
    }

    // void main(void) {
    //     // Normalize the normal vector to ensure accurate lighting calculations
    //     vec3 normal = normalize(vNormal);

    //     // Use the normal vector to determine color (example: gradient based on Y-axis)
    //     vec3 color = vec3(0.5, 0.5, 0.5) + 0.5 * normal;

    //     // Output the final color
    //     gl_FragColor = vec4(color, 1.0);
    // }
    `;

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program:', gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
        return null;
    }
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
        return null;
    }    

    return shaderProgram;
}

var canvas;
var gl;
var program;

var projectionMatrix;
var modelViewMatrix;

var vertices;
var normals;

// Example vertices for a flat plane
vertices = [
    vec4(-1.0, 0.0, -1.0, 1.0),  // Vertex 1
    vec4(1.0, 0.0, -1.0, 1.0),   // Vertex 2
    vec4(-1.0, 0.0, 1.0, 1.0),   // Vertex 3
    vec4(1.0, 0.0, 1.0, 1.0)     // Vertex 4
];

// Example normal vectors for the flat plane (pointing upward)
normals = [
    normalize(vec3(0.0, 1.0, 0.0)),  // Normal for Vertex 1
    normalize(vec3(0.0, 1.0, 0.0)),  // Normal for Vertex 2
    normalize(vec3(0.0, 1.0, 0.0)),  // Normal for Vertex 3
    normalize(vec3(0.0, 1.0, 0.0))   // Normal for Vertex 4
];


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    program = initShaders(gl);
    gl.useProgram(program);

    gl.enable(gl.DEPTH_TEST);

    modelViewMatrix = mat4();

    modelViewMatrix = lookAt( vec3(0, 5, 5), vec3(0, 0, 0), vec3(0, 1, 0));

    const uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));

    projectionMatrix = mat4();

    projectionMatrix = perspective( radians(45), canvas.width / canvas.height, 0.1, 100.0);

    const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    const positionAttribute = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttribute);
    gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 0, 0);

    // const normalAttribute = gl.getAttribLocation(program, 'aVertexNormal');
    // gl.enableVertexAttribArray(normalAttribute);
    // gl.vertexAttribPointer(normalAttribute, 3, gl.FLOAT, false, 0, 0);

    requestAnimationFrame(render);

}

let startTime;

function render(timestamp) {
    if (!startTime) {
        startTime = timestamp;
    }

    const elapsedTime = (timestamp - startTime) / 1000.0;

    // Pass the time value to the shader
    const uTimeLocation = gl.getUniformLocation(program, 'uTime');
    gl.uniform1f(uTimeLocation, elapsedTime);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, vertices.length / 3);

    // Request the next animation frame
    requestAnimationFrame(render);
}
