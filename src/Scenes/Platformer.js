class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.jumpboost = false;
        this.jumpboostCount = 0;
        this.score = 0;
    }

    preload(){
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
        this.load.setPath("./assets/");

        this.load.spritesheet('spriteList', 'tilemap_packed.png', {frameWidth: 18, frameHeight: 18});        
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // EC2-1 - Score Text Creation
        this.scoreTrackerText = this.add.text(25, 25, "Score: "+this.score);
        this.scoreTrackerText.setScrollFactor(1);
        // NOTE: Scroll Factor does not appear to work.  This should make the text move with the camera.
        // Phaser Docs claim it should.  Phaser Forums claim it should.  It does not.
        // No errors in the console, though, so just the irritation of incorrect behavior.
        
        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        
        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        // EC3-1 - Coin Animation
        this.anims.create({
            key:'coin',
            frames: this.anims.generateFrameNumbers('spriteList', {start: 151, end: 152}),
            frameRate: 8,
            repeat: -1
        });

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        // EC1-2 - Jump Boost Creation
        this.jumpboost = this.map.createFromObjects("Objects", {
            name: "jumpboost",
            key: "tilemap_sheet",
            frame: 67
        });

        // EC3-2 - Coin Animation Implementation
        for (let coin of this.coins){
            coin.play("coin");
        }

        // EC1-1 - Spawn Point Creation
        this.spawnPoint = this.map.findObject("Objects", obj => obj.name === "spawn");

        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);


        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        // EC1-4 - Jump Boost Physics Implementation
        this.physics.world.enable(this.jumpboost, Phaser.Physics.Arcade.STATIC_BODY);
        this.jumpboostGroup = this.add.group(this.jumpboost);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(this.spawnPoint.x, this.spawnPoint.y, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // EC2-2 - Coin VFX Creation
        my.vfx.coins = this.add.particles(0, 0, "kenny-particles", {
            frame: ['star_01.png', 'star_02.png', 'star_03.png'],
            scale: {start: 0.03, end: 0.1},
            maxAliveParticles: 8,
            lifespan: 350,
            gravityY: -100,
            alpha: {start: 1, end: 0.1}, 
        });
        my.vfx.coins.stop();
        this.coinCounter = 0;

        // Handle collision detection with coins
        // EC2-3 - Coin VFX Implementation
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            my.vfx.coins.setX(obj2.x);
            my.vfx.coins.setY(obj2.y);
            my.vfx.coins.start();
            this.coinCounter = 30;
            obj2.destroy(); // remove coin on overlap
            this.score += 100;
            this.scoreTrackerText.setText("Score: "+this.score)
        });

        // EC1-5 - Jump Boost Collision Implementation
        this.physics.add.overlap(my.sprite.player, this.jumpboostGroup, (obj1, obj2) => {
            obj2.destroy(); // remove powerup on overlap
            this.jumpboost = true;
            this.jumpboostCount = 180;
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add random: true
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 350,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        
        // EC4: IMPLEMENT WATER PARTICLES AND WATER DEATH/RESPAWN

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        
        this.animatedTiles.init(this.map);
    }

    update() {
        if (this.jumpboostCount > 0){
            this.jumpboostCount -= 1;
        }
        if (this.jumpboostCount == 0){
            this.jumpboost = false;
        }
        if (this.coinCounter > 0){
            this.coinCounter -= 1;
        }
        if (this.coinCounter == 0){
            my.vfx.coins.stop();
        }

        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            if (this.jumpboost){
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY*1.5);
            }
            else {
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            }
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
}