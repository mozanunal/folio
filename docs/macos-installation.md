# Installing Folio on macOS

Folio 0.1.0 Beta is built for Apple Silicon Macs. Its app is ad-hoc signed, but it is not signed with an Apple Developer ID or notarized. Downloading it through a browser can therefore show **Apple could not verify that Folio is free of malware**. Renaming the app or downloading it again does not resolve this warning.

## First launch of the beta

Only continue with a copy downloaded from [Folio's GitHub releases](https://github.com/mozanunal/folio/releases).

1. Extract the macOS ZIP and move `Folio.app` into Applications.
2. Open it once. If macOS blocks it, click **Done** in the warning, rather than Move to Trash.
3. Open **System Settings > Privacy & Security**.
4. Scroll to the Security section and find the message about Folio. Click **Open Anyway**.
5. Authenticate if prompted, then click **Open** in the confirmation dialog.

macOS remembers the exception for that app. If Finder extracted it as `Folio-2.app`, the warning and settings will use that name. A managed Mac may restrict this option.

This follows [Apple's instructions for opening an app that has not been notarized](https://support.apple.com/en-us/102445). It does not require disabling Gatekeeper or removing quarantine attributes through Terminal.

## Removing this warning in future releases

The distribution fix is a **Developer ID Application** signature followed by Apple notarization and stapling. Ad-hoc signing alone cannot remove this warning. See the [Tauri signing guide](https://v2.tauri.app/distribute/sign/macos/).

Folio's release workflow supports this through six GitHub Actions repository secrets:

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64 encoding of the exported Developer ID Application `.p12` certificate, including its private key. |
| `APPLE_CERTIFICATE_PASSWORD` | Password used to export that certificate. |
| `APPLE_SIGNING_IDENTITY` | Full certificate identity, beginning with `Developer ID Application:`. |
| `APPLE_ID` | Apple account email used for notarization. |
| `APPLE_PASSWORD` | An Apple app-specific password, not the account's normal password. |
| `APPLE_TEAM_ID` | Apple Developer team ID. |

A paid Apple Developer membership and a valid Developer ID Application certificate are required. Store credentials in GitHub Actions secrets, never in source files, issues or chat messages.

With all six secrets configured, Tauri imports the certificate, signs the app and submits it for notarization. Packaging verifies the signature, stapled ticket and Gatekeeper assessment before creating the ZIP. It preserves the Developer ID signature instead of replacing it with an ad-hoc one.

With no signing secrets configured, the beta build keeps ad-hoc signing and requires the first-launch steps above. Partial credentials fail the build instead of silently producing an unsigned download. Actual notarization cannot be verified until real credentials are configured.

Publish a new version once signing is enabled. Existing 0.1.0 downloads remain unchanged and still need the first-launch allowance.
