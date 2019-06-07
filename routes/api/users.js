const express = require('express'),
      gravatar = require('gravatar'),
      bcrypt = require('bcryptjs'),
      jwt = require('jsonwebtoken'),
      config = require('config'),
      router = express.Router(),
      { check, validationResult } = require('express-validator/check');

const User = require('../../models/User');

// @route POST api/users
// @desc Register user
// @access Public
router.post(
  '/', 
  [
    check('name', 'Name is required.').not().isEmpty(),
    check('email', 'Must use a valid email.').isEmail(),
    check('password', 'Password must be at least 6 characters long.').isLength({ min: 6 })
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // See if user exists
      let user = await User.findOne({ email });

      if(user) {
        return res.status(400).json({ errors: [{msg: 'User already exists'}]});
      }

      // Get user's avatar
      const avatar = gravatar.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      });

      user = new User({ name, email, avatar, password });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload, 
        config.get('jwtSecret'),
        { expiresIn: 360000 },
        (err, token) => {
          if(err) throw err;
          res.json({ token });
        }
      );
    } catch(err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;