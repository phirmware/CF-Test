import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Request, Response } from 'express'
import { WriteBatch } from '@google-cloud/firestore'

admin.initializeApp()

interface MockData {
  data: string
  time: Date
}

const HTTP_METHODS = {
  post: 'POST',
  get: 'GET',
  delete: 'DELETE'
}

const collections = {
  test: 'test'
}

exports.createCollection = functions.https.onRequest(async (req: Request, res: Response<any>): Promise<void | any> => {
  const collectionRef = admin.firestore().collection(collections.test)
  try {
    for (let i = 0; i < 10000; i++) {
      const mock_data: MockData = {
        data: `mock data ${i}`,
        time: new Date()
      }
      collectionRef.add(mock_data)
    }
    res.json({ message: 'Added successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong, try again' })
  }
})

exports.getAllDataInCollection = functions.https.onRequest(async (req: Request, res: Response<any>): Promise<void | any> => {
  try {
    if (req.method !== HTTP_METHODS.get) return res.status(405).json({ message: 'Invalid http method' })
    const data = await getAllData()
    data ? res.json(data) : res.status(404).json({ message: 'No such data' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong, try again' })
  }
})

exports.deleteCollection = functions.https.onRequest(async (req: Request, res: Response<any>): Promise<void | any> => {
  const data = await getAllData()
  if (req.method !== HTTP_METHODS.delete) return res.status(405).json({ message: 'Invalid http method' })
  if (!data) return res.status(404).json({ message: 'No such data' })
  await deleteAllData()
  return res.json({ message: 'Data deleted' })
})

async function getAllData() {
  const data: any[] = []
  const snapshot = await admin.firestore().collection(collections.test).get()
  if (snapshot.empty) return null
  snapshot.forEach(doc => data.push(doc.data()))
  return data
}

async function deleteAllData(): Promise<Boolean> {
  const snapshot = await admin.firestore().collection(collections.test).get()
  const batchArray: WriteBatch[] = []
  batchArray.push(admin.firestore().batch())
  let counter = 0
  let batchIndex = 0

  snapshot.forEach(doc => {
    batchArray[batchIndex].delete(doc.ref)
    counter++

    // limit of 500 on every batch, we make sure we dont hit the limit
    if (counter === 499) {
      batchArray.push(admin.firestore().batch())
      batchIndex++
      counter = 0
    }
  })

  batchArray.forEach(async batch => await batch.commit())
  return true
}
