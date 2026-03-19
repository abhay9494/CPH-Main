const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
        asar: true,
        extraResource: ['./src/assets/SystemAudioDump'],
        // CHANGE 1: The main internal app name
        name: 'IntelAudioService',
        // CHANGE 2: THIS IS THE MOST IMPORTANT LINE FOR THE .EXE NAME
        executableName: 'IntelAudioService', 
        icon: 'src/assets/logo',
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                // CHANGE 3: The name of the installer file
                name: 'IntelAudioService',
                // CHANGE 4: The name shown in Control Panel / Add Remove Programs
                productName: 'Intel Audio Service',
                // CHANGE 5: The name of the shortcut on Desktop/Start Menu
                shortcutName: 'Intel Audio Service',
                createDesktopShortcut: true,
                createStartMenuShortcut: true,
                // OPTIONAL: Prevent creating a desktop shortcut if you want it hidden
                // createDesktopShortcut: false, 
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            platforms: ['darwin'],
        },
        {
            name: '@reforged/maker-appimage',
            platforms: ['linux'],
            config: {
                options: {
                    // CHANGE 6: Linux specific names (if you ever use Linux)
                    name: 'IntelAudioService',
                    productName: 'Intel Audio Service',
                    genericName: 'System Service',
                    description: 'Intel Audio Service Module',
                    categories: ['System', 'Utility'],
                    icon: 'src/assets/logo.png'
                }
            },
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};