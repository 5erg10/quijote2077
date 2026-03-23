async function execute(intent, userId, user) {
  const objects = user.objects || [];

  if (objects.length === 0) {
    return { action: 'inventario', success: true, objects: [], message: 'Tu mochila está vacía, hidalgo.' };
  }

  const objectList = objects.map(o => `- *${o.name}* (peso: ${o.weight || 0})`).join('\n');
  return {
    action: 'inventario',
    success: true,
    objects,
    message: `Llevas contigo:\n${objectList}`
  };
}

module.exports = { execute };
