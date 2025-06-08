// in src/models/AuditPlugin.js
import mongoose from 'mongoose';
import * as audit from '../services/auditService.js';

export function auditPlugin(schema) {

  
  // After a create or update or delete…
  // schema.post('save', async function(doc) {
  //   await audit.logAction({

  //     actorId:      this.options.actor.id,
  //     actorModel:   this.options.actor.model,
  //     action:       this.wasNew ? 'CREATE' : 'UPDATE',
  //     collectionName: this.constructor.modelName,
  //     documentId:   doc._id,
  //     before:       this._original,    // see below
  //     after:        doc.toObject(),
  //     ipAddress:    this.options.ip,
  //     userAgent:    this.options.ua
  //   });
  // });

  schema.post('save', async function(doc) {
    // read audit context from document locals (set in service)
    const ctx = this.$locals.audit || {};
    await audit.logAction({
      actorId:      ctx.actorId,
      actorModel:   ctx.actorModel,
      action:       this._wasNew ? 'CREATE' : 'UPDATE',
      collectionName: this.constructor.modelName,
      documentId:   doc._id,
      before:       this._original,
      after:        doc.toObject(),
      ipAddress:    ctx.ip,
      userAgent:    ctx.ua
    });
  });

  schema.pre('save', function(next) {
    // capture whether document is new, stash pre-save snapshot for "before"
    this._wasNew = this.isNew;
    this._original = this.toObject();
    next();
  });

  schema.post('findOneAndUpdate', async function(result) {
    await audit.logAction({
      actorId:        this.options.actor.id,
      actorModel:     this.options.actor.model,
      action:         'UPDATE',
      collectionName: this.model.modelName,
      documentId:     this.getQuery()._id,
      before:         this._original,  // capture in pre hook
      after:          result,
      ipAddress:      this.options.ip,
      userAgent:      this.options.ua
    });
  });

  schema.pre('findOneAndUpdate', async function(next) {
    // fetch the "before" doc
    this._original = await this.model.findOne(this.getQuery()).lean();
    next();
  });

  schema.post('findOneAndDelete', async function(result) {
    await audit.logAction({
      actorId:        this.options.actor.id,
      actorModel:     this.options.actor.model,
      action:         'DELETE',
      collectionName: this.model.modelName,
      documentId:     this.getQuery()._id,
      before:         result,
      after:          null,
      ipAddress:      this.options.ip,
      userAgent:      this.options.ua
    });
  });
}
