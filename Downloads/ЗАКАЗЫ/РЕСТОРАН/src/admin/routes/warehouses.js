const express = require('express');
const supabase = require('../../lib/supabase');
const { requireAuth } = require('../middleware/session');

const router = express.Router();
router.use(requireAuth);

// Список складов
router.get('/', async (req, res) => {
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .order('name');

  res.render('warehouses', { warehouses, user: req.session.adminUser });
});

// Создать склад
router.post('/create', async (req, res) => {
  const { name } = req.body;
  if (name?.trim()) {
    await supabase.from('warehouses').insert({ name: name.trim() });
  }
  res.redirect('/admin/warehouses');
});

// Переключить активность
router.post('/:id/toggle', async (req, res) => {
  const { data: wh } = await supabase
    .from('warehouses')
    .select('is_active')
    .eq('id', req.params.id)
    .single();

  if (wh) {
    await supabase
      .from('warehouses')
      .update({ is_active: !wh.is_active })
      .eq('id', req.params.id);
  }
  res.redirect('/admin/warehouses');
});

// Удалить склад
router.post('/:id/delete', async (req, res) => {
  const { error } = await supabase.from('warehouses').delete().eq('id', req.params.id);
  if (error) console.error('[warehouses/delete] Supabase error:', error);
  res.redirect('/admin/warehouses');
});

// Переименовать склад
router.post('/:id/rename', async (req, res) => {
  const { name } = req.body;
  if (name?.trim()) {
    await supabase
      .from('warehouses')
      .update({ name: name.trim() })
      .eq('id', req.params.id);
  }
  res.redirect('/admin/warehouses');
});

module.exports = router;
