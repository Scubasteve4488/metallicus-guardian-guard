// Mini GUARD: body sprite plus the one Nebular Shield and the one Proton Key.
// Shield rides the anatomical LEFT forearm; the Key sits compact at the right hip.
// The Key is never rotated, swung or used to hit anything. Its angle is never set.

const MOVE_SPEED = 62; // native px per second

// Offsets from the body's feet (origin 0.5, 1). depth: +1 in front of body, -1 behind.
const RIG = {
  down:  { shield: ['shield-face', 6, -8, 1],  key: [-5, -5, 1] },
  up:    { shield: ['shield-back', -6, -8, 1], key: [5, -5, 1] },
  right: { shield: ['shield-edge', -3, -8, -1], key: [0, -5, 1] },
  left:  { shield: ['shield-face', -3, -8, 1],  key: [2, -5, -1] },
};

export const KEY_COMPACT_SCALE = 0.45;
export const KEY_ACTIVE_SCALE = 1.4;

export class Guard {
  constructor(scene, x, y, { physics = true, scale = 1, facing = 'down' } = {}) {
    this.scene = scene;
    this.scaleF = scale;
    this.facing = facing;
    this.step = 0;
    this.stepTimer = 0;
    this.moving = false;
    this.shieldRaised = false;
    this.keyActive = false;
    this.frozen = false;

    this.shadow = scene.add.image(x, y, 'shadow').setOrigin(0.5, 0.5).setScale(scale);
    this.body = physics
      ? scene.physics.add.sprite(x, y, `guard-${facing}-0`)
      : scene.add.sprite(x, y, `guard-${facing}-0`);
    this.body.setOrigin(0.5, 1).setScale(scale);
    if (physics) {
      // Collide with the feet only, so he can walk "behind" things.
      this.body.body.setSize(10, 5).setOffset(3, 14);
      this.body.setCollideWorldBounds(true);
    }
    this.shield = scene.add.image(x, y, 'shield-face').setOrigin(0.5, 0.5).setScale(scale);
    this.key = scene.add.image(x, y, 'key').setOrigin(0.5, 1).setScale(KEY_COMPACT_SCALE * scale);
    this.keyGlow = scene.add.image(x, y, 'glow').setAlpha(0).setScale(scale * 0.9);
    this.sync();
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }

  setPosition(x, y) {
    this.body.setPosition(x, y);
    this.sync();
  }

  face(dir) {
    this.facing = dir;
    this.body.setTexture(`guard-${dir}-${this.step}`);
    this.sync();
  }

  // cursors: { left, right, up, down } booleans
  updateMovement(input, dt) {
    if (this.frozen) {
      this.body.setVelocity(0, 0);
      this.moving = false;
    } else {
      let vx = 0;
      let vy = 0;
      if (input.left) vx -= 1;
      if (input.right) vx += 1;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;
      if (vx && vy) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
      this.body.setVelocity(vx * MOVE_SPEED, vy * MOVE_SPEED);
      this.moving = !!(vx || vy);
      if (this.moving) {
        if (Math.abs(vx) > Math.abs(vy)) this.facing = vx > 0 ? 'right' : 'left';
        else if (vy) this.facing = vy > 0 ? 'down' : 'up';
      }
    }
    this.animate(dt);
  }

  animate(dt) {
    if (this.moving) {
      this.stepTimer += dt;
      if (this.stepTimer > 170) { this.stepTimer = 0; this.step = 1 - this.step; }
    } else {
      this.step = 0;
      this.stepTimer = 0;
    }
    this.body.setTexture(`guard-${this.facing}-${this.step}`);
    this.sync();
  }

  sync() {
    const s = this.scaleF;
    const x = this.body.x;
    const y = this.body.y;
    const bob = this.step ? -1 * s : 0;
    const depth = y;
    this.body.setDepth(depth);
    this.shadow.setPosition(x, y).setDepth(depth - 2);

    const rig = RIG[this.facing];
    if (this.shieldRaised) {
      // Brought across the body on the same left arm to cover the lane.
      this.shield.setTexture('shield-face').setPosition(x + 1 * s, y - 9 * s).setScale(1.25 * s).setDepth(depth + 2);
    } else {
      const [tex, ox, oy, d] = rig.shield;
      this.shield.setTexture(tex).setPosition(x + ox * s, y + oy * s + bob).setScale(s).setDepth(depth + d);
    }
    if (!this.keyActive) {
      const [kx, ky, kd] = rig.key;
      this.key.setPosition(x + kx * s, y + ky * s + bob).setScale(KEY_COMPACT_SCALE * s).setDepth(depth + kd);
    } else {
      this.key.setDepth(depth + 3);
      this.keyGlow.setDepth(depth - 1);
    }
  }

  // Compact -> activated -> compact. The same Key object is moved and scaled,
  // held upright; no rotation tween exists. Resolves when the Key is back at the hip.
  activateKey(onPeak) {
    const s = this.scaleF;
    const scene = this.scene;
    this.frozen = true;
    this.face('down');
    this.keyActive = true;
    const hold = { x: this.x - 7 * s, y: this.y - 10 * s };
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.key,
        x: hold.x, y: hold.y,
        scaleX: KEY_ACTIVE_SCALE * s, scaleY: KEY_ACTIVE_SCALE * s,
        duration: 650, ease: 'Back.Out',
        onComplete: () => {
          this.keyGlow.setPosition(hold.x, hold.y - 17 * s);
          scene.tweens.add({ targets: this.keyGlow, alpha: 0.85, duration: 250, yoyo: true, hold: 700 });
          if (onPeak) onPeak();
          scene.time.delayedCall(1300, () => {
            const [kx, ky] = RIG.down.key;
            scene.tweens.add({
              targets: this.key,
              x: this.x + kx * s, y: this.y + ky * s,
              scaleX: KEY_COMPACT_SCALE * s, scaleY: KEY_COMPACT_SCALE * s,
              duration: 450, ease: 'Quad.In',
              onComplete: () => { this.keyActive = false; this.frozen = false; this.sync(); resolve(); },
            });
          });
        },
      });
    });
  }

  destroy() {
    for (const o of [this.shadow, this.body, this.shield, this.key, this.keyGlow]) o.destroy();
  }
}
