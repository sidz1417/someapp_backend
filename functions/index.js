const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { HttpsError } = require('firebase-functions/lib/providers/https');

admin.initializeApp()

exports.onCreateUser = functions.auth.user().onCreate((user, _) => {
    console.log(`New user created : ${user.uid}`)
})

exports.createClaims = functions.firestore.document('moderators/{moderator}').onCreate(async (snap, _) => {
    const userID = snap.data().uid
    try {
        let userRecord = await admin.auth().getUser(userID)
        let userClaims = userRecord.customClaims
        console.log(`Custom claims of user ${userID} before create: ${JSON.stringify(userClaims)}`)
        if (typeof userClaims === 'undefined') {
            await admin.auth().setCustomUserClaims(userID, { isModerator: true })
            userRecord = await admin.auth().getUser(userID)
            userClaims = userRecord.customClaims
            console.log(`Custom claims added for user ${userID} : ${JSON.stringify(userClaims)}`)
        }
        else if (!userClaims['isModerator']) {
            await admin.auth().setCustomUserClaims(userID, { isModerator: true })
            userRecord = await admin.auth().getUser(userID)
            userClaims = userRecord.customClaims
            console.log(`Custom claims added for user ${userID} : ${JSON.stringify(userClaims)}`)
        }
        else {
            console.log(`Custom claims already exist for user ${userID} : ${JSON.stringify(userClaims)}`)
        }
    }
    catch (e) {
        console.log(e.message)
        const db = admin.firestore()
        return await db.runTransaction(async t => {
            const docRef = db.doc(`moderators/${snap.id}`)
            t.delete(docRef)
        })
    }
})

exports.revokeClaims = functions.firestore.document('moderators/{userId}').onDelete(async (snap, _) => {
    try {
        const userID = snap.data().uid
        let userRecord = await admin.auth().getUser(userID)
        let userClaims = userRecord.customClaims
        console.log(`Custom claims of user ${userID} before revoke: ${JSON.stringify(userClaims)}`)
        if (userClaims['isModerator']) {
            await admin.auth().setCustomUserClaims(userID, null)
            userRecord = await admin.auth().getUser(userID)
            userClaims = userRecord.customClaims
            console.log(`Custom claims of user ${userID} after revoke: ${JSON.stringify(userClaims)}`)
        }
        else {
            console.log(`Custom claims of user ${userID} is already null`)
        }
    }
    catch (e) {
        console.log(e.message)
        console.log('An improper doc was deleted')
    }
})


exports.createCategory = functions.https.onCall(async (params, context) => {
    if (context.auth == null) throw new HttpsError('permission-denied', 'User is not Authenticated!!')
    const userID = context.auth.uid
    console.log(`userID ${userID} invoked createCategory`)
    const categoryName = params.categoryName
    if (categoryName.length > 10) throw new HttpsError('permission-denied', 'Category Name length should be less than 10 characters')
    const userRecord = await admin.auth().getUser(userID)
    const customClaims = userRecord.customClaims
    console.log(`Custom claims of user ${userID} : ${JSON.stringify(customClaims)}`)
    if (customClaims == null || !customClaims['isModerator']) {
        throw new HttpsError('permission-denied', 'Creation not possible as user is not a moderator')
    }
    const db = admin.firestore()
    return await db.runTransaction(async t => {
        const categoryRef = db.doc(`categories/${categoryName}`)
        return t.set(categoryRef, { count: 0 })
    })
})

exports.removeCategory = functions.https.onCall(async (params, context) => {
    if (context.auth == null) throw new HttpsError('permission-denied', 'User is not Authenticated!!')
    const userID = context.auth.uid
    console.log(`userID ${userID} invoked removeCategory`)
    const categoryName = params.categoryName
    const userRecord = await admin.auth().getUser(userID)
    const customClaims = userRecord.customClaims
    console.log(`Custom claims of user ${userID} : ${JSON.stringify(customClaims)}`)
    if (customClaims == null || !customClaims['isModerator']) {
        throw new HttpsError('permission-denied', 'Deletion not possible as user is not a moderator')
    }
    const db = admin.firestore()
    return await db.runTransaction(async t => {
        const categoryRef = db.doc(`categories/${categoryName}`)
        const categoryDoc = await t.get(categoryRef)
        if (!categoryDoc.exists)
            throw new HttpsError('unavailable', `Deletion not possible as category ${categoryName} does not exist`)
        return t.delete(categoryRef)
    })
})

exports.upVote = functions.https.onCall(async (params, context) => {
    if (context.auth == null) throw new HttpsError('permission-denied', 'User is not Authenticated!!')
    const userID = context.auth.uid
    console.log(`userID ${userID} invoked upVote`)
    const categoryName = params.categoryName
    const db = admin.firestore()
    return await db.runTransaction(async t => {
        const categoryRef = db.doc(`categories/${categoryName}`)
        const categoryDoc = await t.get(categoryRef)
        if (!categoryDoc.exists)
            throw new HttpsError('unavailable', `Upvote not possible as category ${categoryName} does not exist`)
        return t.update(categoryRef, { 'count': categoryDoc.data()['count'] + 1 })
    })
})

