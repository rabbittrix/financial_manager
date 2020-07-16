const bcrypt = require('bcrypt-nodejs');

module.exports = (app) => {
  const findAll = () => {
    return app.db('users').select(['id', 'name', 'mail']);
  };

  const findOne = (filter = {}) => {
    return app.db('users').where(filter).first();
  };

  const getPasswdHash = (password) => {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  const save = async (user) => {
    if (!user.name) return { error: 'Name is a required attribute' };
    if (!user.mail) return { error: 'E-mail is a required attribute' };
    if (!user.password) return { error: 'Password is a required attribute' };
    
    const userDb = await findOne({ mail: user.mail });
    if (userDb) return {
      error: 'There is already a user with this email'
    };

    const newUser = { ...user };
    newUser.password = getPasswdHash(user.password);
    return app.db('users').insert(newUser, ['id', 'name', 'mail']);
  };
  return { findAll, save, findOne };
}
