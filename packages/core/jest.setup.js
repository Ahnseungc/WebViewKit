require("@testing-library/jest-dom");

// jsdom 에 없는 TextEncoder 를 react-router 가 import 시점에 쓴다
const { TextDecoder, TextEncoder } = require("util");
Object.assign(global, { TextDecoder, TextEncoder });
