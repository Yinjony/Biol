const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { parseQuestionDocument } = require('./document-parser')

const app = express()
const port = Number(process.env.PORT || 3000)

app.use(cors())

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// CloudBase RDB handles all question storage. This HTTP endpoint only parses
// an uploaded Word document before the mini program saves its questions to RDB.
app.post('/api/questions/import', documentUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ ok: false, message: '请选择 Word 文件' })
      return
    }

    const result = await parseQuestionDocument(req.file)
    res.json({ ok: true, data: result.questions, invalid: result.invalid })
  } catch (error) {
    next(error)
  }
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({
    ok: false,
    message: error.message || '服务器错误',
  })
})

app.listen(port, () => {
  console.log(`Document import API listening at http://127.0.0.1:${port}`)
})
