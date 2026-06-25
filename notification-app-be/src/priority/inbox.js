const TYPE_PRIORITY = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function typeRank(type) {
  return TYPE_PRIORITY[type] || 0;
}

function computeScore(notification) {
  const rank = BigInt(typeRank(notification.type));
  const timestamp = BigInt(Math.floor(notification.timestamp.getTime() / 1000));
  return rank * 1_000_000_000_000n + timestamp;
}

function rankNotifications(notifications) {
  return notifications
    .filter((n) => !n.isRead)
    .map((notification) => ({
      notification,
      typeRank: typeRank(notification.type),
      score: computeScore(notification).toString(),
    }))
    .sort((a, b) => {
      const scoreDiff = BigInt(b.score) - BigInt(a.score);
      if (scoreDiff !== 0n) {
        return scoreDiff > 0n ? 1 : -1;
      }
      return b.notification.id.localeCompare(a.notification.id);
    });
}

function topN(notifications, n) {
  const ranked = rankNotifications(notifications);
  if (n <= 0 || n >= ranked.length) {
    return ranked;
  }
  return ranked.slice(0, n);
}

class PriorityInbox {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = [];
  }

  upsert(notification) {
    if (notification.isRead) {
      return;
    }

    const item = {
      notification,
      typeRank: typeRank(notification.type),
      score: computeScore(notification).toString(),
    };

    this.items.push(item);
    this.items.sort((a, b) => {
      const scoreDiff = BigInt(b.score) - BigInt(a.score);
      return scoreDiff > 0n ? 1 : scoreDiff < 0n ? -1 : 0;
    });

    if (this.items.length > this.capacity) {
      this.items = this.items.slice(0, this.capacity);
    }
  }

  snapshot() {
    return [...this.items];
  }
}

function buildInboxFromBatch(notifications, capacity) {
  const inbox = new PriorityInbox(capacity);
  for (const notification of notifications) {
    inbox.upsert(notification);
  }
  return inbox;
}

module.exports = {
  TYPE_PRIORITY,
  typeRank,
  computeScore,
  rankNotifications,
  topN,
  PriorityInbox,
  buildInboxFromBatch,
};
