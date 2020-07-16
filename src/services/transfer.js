const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const find = (filter = {}) => {
    return app.db('transfers')
      .where(filter)
      .select();
  };

  const findOne = (filter = {}) => {
    return app.db('transfers')
      .where(filter)
      .first();
  };

  const validate = async (transfer) => {
    if (!transfer.description) throw new ValidationError('Description is a required attribute');
    if (!transfer.amount) throw new ValidationError('Value is a required attribute');
    if (!transfer.date) throw new ValidationError('Date is a required attribute');
    if (!transfer.acc_ori_id) throw new ValidationError('Source Account is a required attribute');
    if (!transfer.acc_dest_id) throw new ValidationError('Target Account is a required attribute');
    if (transfer.acc_ori_id === transfer.acc_dest_id) throw new ValidationError('It is not possible to transfer from an account to itself');

    const accounts = await app.db('accounts').whereIn('id', [transfer.acc_dest_id, transfer.acc_ori_id]);
    accounts.forEach((acc) => {
      if (acc.user_id !== parseInt(transfer.user_id, 10)) throw new ValidationError(`Account #${acc.id} does not belong to the user`);
    });
  };

  const save = async (transfer) => {
    const result = await app.db('transfers').insert(transfer, '*');
    const transferId = result[0].id;

    const transactions = [
      { description: `Transfer to acc #${transfer.acc_dest_id}`, date: transfer.date, amount: transfer.amount * -1, type: 'O', acc_id: transfer.acc_ori_id, transfer_id: transferId, status: true },
      { description: `Transfer from acc #${transfer.acc_ori_id}`, date: transfer.date, amount: transfer.amount, type: 'I', acc_id: transfer.acc_dest_id, transfer_id: transferId, status: true },
    ];

    await app.db('transactions').insert(transactions);
    return result;
  };

  const update = async (id, transfer) => {
    const result = await app.db('transfers')
      .where({ id })
      .update(transfer, '*');

    const transactions = [
      { description: `Transfer to acc #${transfer.acc_dest_id}`, date: transfer.date, amount: transfer.amount * -1, type: 'O', acc_id: transfer.acc_ori_id, transfer_id: id, status: true },
      { description: `Transfer from acc #${transfer.acc_ori_id}`, date: transfer.date, amount: transfer.amount, type: 'I', acc_id: transfer.acc_dest_id, transfer_id: id, status: true },
    ];

    await app.db('transactions').where({ transfer_id: id }).del();
    await app.db('transactions').insert(transactions);
    return result;
  };

  const remove = async (id) => {
    await app.db('transactions').where({ transfer_id: id }).del();
    return app.db('transfers').where({ id }).del();
  };

  return { find, save, findOne, update, validate, remove };
};
