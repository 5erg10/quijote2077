function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  res.status(500).json({
    messages: [{ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' }]
  });
}

module.exports = { errorHandler };
