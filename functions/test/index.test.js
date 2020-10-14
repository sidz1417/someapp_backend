const test = require('firebase-functions-test')({
    projectId: "testappproject-bee5f",
},'C:/Users/Siddharth/Desktop/someapp_backend/firebase_emulator_config/testappproject-bee5f-ae98ab0f8d29.json')

const myFunctions = require('../index')

test.auth.makeUserRecord({isModerator : false})
const wrapped = test.wrap(myFunctions.createCategory)

wrapped({categoryName : 'something'})