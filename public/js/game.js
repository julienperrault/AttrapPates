const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 1280,
    height: 720,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const positionsAvatar = {
    red: [50, 55],
    blue: [540, 55],
}
const game = new Phaser.Game(config);

function preload() {
    this.load.image('background', 'assets/background.jpg');
    this.load.image('red', 'assets/JeanneRouge.png');
    this.load.image('blue', 'assets/JeanBleu.png');
    this.load.image('redAvatar', 'assets/JeanneRougeAvatar.png');
    this.load.image('blueAvatar', 'assets/JeanBleuAvatar.png');
    this.load.image('pasta', 'assets/panzani.png');
    this.load.spritesheet("button", "assets/button_sprite_sheet.png", {
        frameWidth: 193,
        frameHeight: 71
    });
}

function create() {
    const self = this;
    this.socket = io();

    const displayPlayer = (player) => player.id === self.socket.id ? addPlayer(self, player) : addOtherPlayer(self, player);
    const buildAvatar = (color) => {
        const avatar = self.add.image(...positionsAvatar[color], `${color}Avatar`);
        avatar.flipX = true;
        avatar.displayWidth = self.game.config.width * .08;
        avatar.scaleY = avatar.scaleX;
    }

    // #region Background and graphics
    self.background = this.add.image(self.game.config.width / 2, self.game.config.height / 2, 'background');
    self.background.displayWidth = self.game.config.width;
    self.background.scaleY = self.background.scaleX;

    const graphics = this.add.graphics();

    graphics.fillStyle(0xFFFFFF, 0.8);
    graphics.fillRect(0, 0, 1280, 120);

    buildAvatar('red');
    buildAvatar('blue');
    // #endregion

    self.readyToStart = false;

    this.socket.on('currentPlayers', (players) => {
        Object.values(players).filter(p => p.team).forEach(displayPlayer);
    });

    this.socket.on('newPlayer', function (player) {
        displayPlayer(player);
    });

    this.socket.on('disconnect', function () {
        if (self.otherPlayer) self.otherPlayer.destroy();
    });

    this.socket.on('pastaLocation', function (pastaLocation) {
        self.pasta = self.add.image(pastaLocation.x, pastaLocation.y, 'pasta');
        // self.pasta.setInteractive();
        // self.pasta.on("pointerdown", () => self.socket.emit('pastaCollected'));
    });

    this.scores = {
        red: this.add.text(100, 30, 'RED', {
            fontSize: '64px',
            fill: '#FF0000'
        }),
        blue: this.add.text(600, 30, 'BLUE', {
            fontSize: '64px',
            fill: '#0000FF'
        })
    };
    this.validations = {
        red: this.add.text(100, 80, 'WAITING', {
            fontSize: '32px',
            fill: '#FF0000'
        }),
        blue: this.add.text(600, 80, 'WAITING', {
            fontSize: '32px',
            fill: '#0000FF'
        })
    };
    this.indicators = {
        red: this.add.text(100, 5, '', {
            fontSize: '32px',
            fill: '#FF0000'
        }),
        blue: this.add.text(600, 5, '', {
            fontSize: '32px',
            fill: '#0000FF'
        })
    };

    this.button = new Phaser.Button(this, {
        x: 1000,
        y: 30,
        spritesheet: 'button',
        on: {
            click: () => {
                console.log("Clicked!");
                self.socket.emit('validate');
                self.button.sprite.destroy();
            },
        },
        frames: {
            click: 0,
            over: 2,
            up: 0,
            out: 1
        }
    });

    this.socket.on('deletePasta', function () {
        if (self.pasta) {
            self.pasta.destroy();
            delete self.pasta;
        }
        self.button.addButtSprite();
        self.button.setListeners();
    });

    this.socket.on('scoreUpdate', function (scores) {
        self.scores.red.setText('RED: ' + scores.red);
        self.scores.blue.setText('BLUE:' + scores.blue);
    });
    this.socket.on('validateUpdate', function (validations) {
        self.readyToStart = validations.red && validations.blue;
        self.validations.red.setText(validateText(validations.red));
        self.validations.blue.setText(validateText(validations.blue));
    });
    this.input.on('pointerdown', function (pointer) {
        if (self.readyToStart) {
            self.socket.emit(self.pasta ? 'pastaCollected' : 'pastaFailed');
        }
    });
}

const validateText = (bool) => bool ? 'READY' : 'WAITING';

function update() {}

function addPlayer(self, playerInfo) {
    const currentPlayerSprite = self.add.image(180, 470, playerInfo.team);
    currentPlayerSprite.flipX = true;
    currentPlayerSprite.displayWidth = self.game.config.width * .3;
    currentPlayerSprite.scaleY = currentPlayerSprite.scaleX;
    self.indicators[playerInfo.team].setText('You');
}

function addOtherPlayer(self, playerInfo) {
    const otherPlayer = self.add.image(1100, 470, playerInfo.team);
    otherPlayer.displayWidth = self.game.config.width * .3;
    otherPlayer.scaleY = otherPlayer.scaleX;

    self.indicators[playerInfo.team].setText('Enemy');
    otherPlayer.id = playerInfo.id;
    self.otherPlayer = otherPlayer;
}