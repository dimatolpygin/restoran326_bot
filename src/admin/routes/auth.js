const express = require('express');
const bcrypt = require('bcrypt');
const supabase = require('../../lib/supabase');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session?.adminUser) return res.redirect('/admin/warehouses');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const { data: user } = await supabase
    .from('admin_users')
    .select('id, username, password_hash')
    .eq('username', username)
    .single();

  if (!user) {
    return res.render('login', { error: 'Неверный логин или пароль' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.render('login', { error: 'Неверный логин или пароль' });
  }

  req.session.adminUser = { id: user.id, username: user.username };
  return res.redirect('/admin/warehouses');
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

module.exports = router;
