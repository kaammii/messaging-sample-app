const { Pool } = require('pg');
let instance = null;

module.exports = class DatabaseConnector {
  constructor() {
    if (instance != null) {
      return instance;
    }
    this.pool = new Pool({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      port: process.env.DATABASE_PORT,
    })

    instance = this;
  }

  async getAllThreads() {
    let conn;
    try {
      conn = await this.pool.connect();
      const rows = await conn.query(
        "SELECT DISTINCT id,unread_count,time,text FROM thread JOIN ( SELECT id as messageid,time,text,thread_id from message ) as m ON messageid=last_message_id ORDER BY TIME DESC"
      );
      return rows;
    } catch (e) {
      throw e;
    } finally {
      conn.release();
    }
  }

  async threadExists(id) {
    let conn;
    try {
      conn = await this.pool.connect();
      const rows = await conn.query("SELECT * FROM thread WHERE id = $1", [id]);
      return rows.length > 0;
    } catch (e) {
      throw e;
    } finally {
      conn.release();
    }
  }

  async getMessageForThread(threadId) {
    let conn;
    try {
      conn = await this.pool.connect();
      const rows = await conn.query(
        "SELECT payload from message WHERE thread_id = $1 ORDER BY time ASC",
        [threadId]
      );

      let messages = [];
      rows.forEach(row => {
        messages.push(this.rowToMessage(row));
      })
      return messages;
    } catch (e) {
      throw e;
    } finally {
      conn.release();
    }
  }

  async getMessage(messageId) {
    let conn;
    try {
      conn = await this.pool.connect();
      const rows = await conn.query(
        "SELECT payload from message WHERE id = $1",
        [messageId]
      );
      return this.rowToMessage(row);
    } catch (e) {
      throw e;
    } finally {
      conn.release();
    }
  }

  async clearUnreadMessagesForThread() {
    let conn;
    try {
      conn = await this.pool.connect();
      await conn.query("UPDATE thread SET unread_count = 0 WHERE id = $1", [
        number
      ]);
    } catch (e) {
      throw e;
    } finally {
      conn.release();
    }
  }

  async insertMessage(message) {
    let conn;
    let threadId = this.getThreadIdForMessage(message);
    try {
      conn = await this.pool.connect();
      await conn.query(
        "INSERT INTO message (payload, thread_id, id, to_number, from_number, direction, time, text) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [message, threadId, message.id, message.to_number, message.from_number, message.direction, message.time, message.text]
      );
      let query = "UPDATE thread SET last_message_id = $1";
      if (message.direction === 'in') {
        query = query + ', unread_count = unread_count + 1';
      }
      query = query + ' WHERE id = $2';
      await conn.query(query, [message.id, threadId]);
      return message;
    } catch (e) {
      throw e;
    } finally {
      conn.release();
    }
  }

  async insertThread(id) {
    let conn;
    try {
      conn = await this.pool.connect();
      await conn.query("INSERT INTO thread (id) VALUES ($1)", [id]);
      return id;
    } catch (e) {
      throw e;
    } finally {
      conn.release();
    }
  }

  rowToMessage(row) {
    return JSON.parse(row.payload);
  }

  getThreadIdForMessage(message) {
    let participants = message.to.slice();
    participants.push(message.from);
    return participants.sort().join();
  }
}