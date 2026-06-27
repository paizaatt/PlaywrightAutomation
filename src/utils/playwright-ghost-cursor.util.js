const { path } = require('ghost-cursor');
const {
  overshoot,
  magnitude,
  direction,
  add,
} = require('ghost-cursor/lib/math');

const OVERSHOOT_SPREAD = 10;
const OVERSHOOT_RADIUS = 120;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatPoint = (point) =>
  `(${Math.round(point.x)}, ${Math.round(point.y)})`;

function getRandomBoxPoint(box, options = {}) {
  const paddingPercentage = options.paddingPercentage ?? 0;
  let paddingWidth = 0;
  let paddingHeight = 0;

  if (paddingPercentage > 0 && paddingPercentage <= 100) {
    paddingWidth = (box.width * paddingPercentage) / 100;
    paddingHeight = (box.height * paddingPercentage) / 100;
  }

  return {
    x: box.x + paddingWidth / 2 + Math.random() * (box.width - paddingWidth),
    y: box.y + paddingHeight / 2 + Math.random() * (box.height - paddingHeight),
  };
}

function shouldOvershoot(from, to, threshold = 500) {
  return magnitude(direction(from, to)) > threshold;
}

function resolveTargetLabel(target, options = {}) {
  if (options.label) return options.label;
  if (typeof target === 'string') return target;
  return '[locator]';
}

/**
 * Ghost Cursor adapter cho Playwright.
 * Dùng path/bezier/overshoot từ ghost-cursor; click qua locator để HTMX hoạt động.
 */
class PlaywrightGhostCursor {
  constructor(page, options = {}) {
    this.page = page;
    this.location = options.start ?? { x: 0, y: 0 };
    this.defaultOptions = options.defaultOptions ?? {};
    this.visible = options.visible ?? false;
    this.logMouse = options.logMouse ?? true;
    this._lastTarget = null;
    this._lastTimestamp = null;
  }

  log(message) {
    if (this.logMouse) console.log(message);
  }

  async init() {
    this.log(`[Cursor] Khởi tạo — vị trí ban đầu: ${formatPoint(this.location)}`);

    if (this.visible) {
      await this.page.evaluate(() => {
        if (document.getElementById('ghost-cursor-dot')) return;

        const dot = document.createElement('div');
        dot.id = 'ghost-cursor-dot';
        dot.style.cssText =
          'position:fixed;width:12px;height:12px;border-radius:50%;background:rgba(255,0,0,0.7);pointer-events:none;z-index:999999;transform:translate(-50%,-50%);';
        document.body.appendChild(dot);

        document.addEventListener('mousemove', (event) => {
          dot.style.left = `${event.clientX}px`;
          dot.style.top = `${event.clientY}px`;
        });
      });
    }
  }

  resolveLocator(target) {
    return typeof target === 'string' ? this.page.locator(target).first() : target;
  }

  async moveMouse(destination, options = {}) {
    const start = { ...this.location };
    const vectors = path(this.location, destination, {
      moveSpeed: options.moveSpeed,
      spreadOverride: options.spreadOverride,
      useTimestamps: options.useTimestamps,
    });

    this.log(
      `  [moveMouse] Bắt đầu: ${formatPoint(start)} → Đích: ${formatPoint(destination)} (${vectors.length} điểm)`,
    );

    for (let i = 0; i < vectors.length; i++) {
      const point = vectors[i];

      if ('timestamp' in point && this._lastTimestamp !== null) {
        const waitMs = point.timestamp - this._lastTimestamp;
        if (waitMs > 0) await delay(waitMs);
        this._lastTimestamp = point.timestamp;
      } else if ('timestamp' in point) {
        this._lastTimestamp = point.timestamp;
      }

      await this.page.mouse.move(point.x, point.y);
      this.location = { x: point.x, y: point.y };
      this.log(
        `  [moveMouse] Điểm ${i + 1}/${vectors.length}: ${formatPoint(point)}`,
      );
    }

    this.log(`  [moveMouse] Kết thúc: ${formatPoint(this.location)}`);

    const moveDelay = options.moveDelay ?? 0;
    if (moveDelay > 0) {
      const randomize = options.randomizeMoveDelay ?? true;
      await delay(moveDelay * (randomize ? Math.random() : 1));
    }
  }

  async move(target, options = {}) {
    const label = resolveTargetLabel(target, options);
    const opts = {
      paddingPercentage: 0,
      overshootThreshold: 500,
      moveDelay: 0,
      randomizeMoveDelay: true,
      ...this.defaultOptions.move,
      ...options,
    };

    this.log(`\n[${label}] === BẮT ĐẦU MOVE ===`);
    this.log(`  Vị trí chuột hiện tại: ${formatPoint(this.location)}`);

    const locator = this.resolveLocator(target);
    await locator.scrollIntoViewIfNeeded();
    await locator.waitFor({ state: 'visible' });

    const box = await locator.boundingBox();
    if (!box) {
      throw new Error('Element has no bounding box');
    }

    const destination = opts.destination
      ? add(box, opts.destination)
      : getRandomBoxPoint(box, opts);

    this.log(
      `  Element box: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`,
    );
    this.log(`  Đích di chuyển (viewport): ${formatPoint(destination)}`);
    this.log(
      `  Overshoot: ${shouldOvershoot(this.location, destination, opts.overshootThreshold) ? 'có' : 'không'}`,
    );

    if (shouldOvershoot(this.location, destination, opts.overshootThreshold)) {
      await this.moveMouse(overshoot(destination, OVERSHOOT_RADIUS), opts);
      await this.moveMouse(
        { x: destination.x, y: destination.y },
        { ...opts, spreadOverride: OVERSHOOT_SPREAD },
      );
    } else {
      await this.moveMouse(destination, opts);
    }

    this._lastTarget = { locator, box, destination, label };
    this.log(`[${label}] === KẾT THÚC MOVE ===`);
    this.log(`  Vị trí chuột: ${formatPoint(this.location)}`);

    return locator;
  }

  async click(target, options = {}) {
    const label = resolveTargetLabel(target, options);
    const opts = {
      hesitate: 0,
      waitForClick: 0,
      moveDelay: 0,
      randomizeMoveDelay: true,
      paddingPercentage: 15,
      ...this.defaultOptions.click,
      ...options,
    };

    this.log(`\n[${label}] === BẮT ĐẦU CLICK ===`);
    this.log(`  Vị trí chuột hiện tại: ${formatPoint(this.location)}`);

    await this.move(target, { ...opts, moveDelay: 0, label });
    await delay(opts.hesitate);

    const { locator, box, destination } = this._lastTarget;
    const clickX = destination.x - box.x;
    const clickY = destination.y - box.y;

    this.log(
      `  Click tại (relative element): (${Math.round(clickX)}, ${Math.round(clickY)})`,
    );
    this.log(`  hesitate: ${opts.hesitate}ms, waitForClick: ${opts.waitForClick}ms`);

    await locator.click({ position: { x: clickX, y: clickY } });

    await delay(opts.waitForClick);

    if (opts.moveDelay > 0) {
      await delay(opts.moveDelay * (opts.randomizeMoveDelay ? Math.random() : 1));
    }

    this.log(`[${label}] === KẾT THÚC CLICK ===`);
    this.log(`  Vị trí chuột: ${formatPoint(this.location)}`);
  }

  getLocation() {
    return this.location;
  }
}

module.exports = { PlaywrightGhostCursor };
