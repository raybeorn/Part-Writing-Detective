/* samples.js: the Salamander piano samples and their Subresource Integrity (SRI) hashes.
 * audio.js and sw.js (through importScripts) use this file, so both check each sample against the same SHA-384 hash.
 * The browser rejects a sample if its bytes do not match. The app does not play or cache that sample.
 * If a sample changes upstream, make a new hash with this command and add the prefix "sha384-":
 *   curl -sL <sample-url> | openssl dgst -sha384 -binary | openssl base64 -A
 */

self.PIANO_SAMPLES = {
  baseUrl: "https://tonejs.github.io/audio/salamander/",
  // Tone.js note name: file and hash
  notes: {
    "A0": { file: "A0.mp3", integrity: "sha384-oyQY2sDcJNGMSLOKjo4NURtTq8agsqr4lYrTubGOJxd57aMX2bFxdE6fBAvVb8KU" },
    "C1": { file: "C1.mp3", integrity: "sha384-6oD1RhDnGFODAE9HpGCTmCvswG6GVigXBtprVTzBvQAEUOPU2Wej0pcMRFcpVVDN" },
    "D#1": { file: "Ds1.mp3", integrity: "sha384-ZdMZtSuGSdf3EAVDcjZRSCLMGQ79rfRnixY85DR4ZlkxwxStK7WgpK7PdWLzypuy" },
    "F#1": { file: "Fs1.mp3", integrity: "sha384-5RlcOlGWhiXoACreewXWM/Fd+Wh1SOWqnvAxSOj2h44hqS59scNd6ekvmWiPeTiF" },
    "A1": { file: "A1.mp3", integrity: "sha384-r6b5UplwURKouKjAwOVTStTW76ldNixoWSU18TuzUwn9vqRDry0z9LvzslyVG1Oi" },
    "C2": { file: "C2.mp3", integrity: "sha384-RbKMVJDZRzIUxd0nXdFSAZ6ffealaukeQY1LyJzAgBBmi/9XZdPfzS3p/9QM5AjO" },
    "D#2": { file: "Ds2.mp3", integrity: "sha384-H1HHEnv+So/xlZuK1yGEBZucSddgGoCIdBbJYDfEqG1EJZQJkUUQRnssr9RT+Jr4" },
    "F#2": { file: "Fs2.mp3", integrity: "sha384-KeuggYOh+RkvLkVRMZllxGQOhAdFQzHiRBQDJAiyJfACShA6qHuns0TeuKFwqYpn" },
    "A2": { file: "A2.mp3", integrity: "sha384-CTazfCINJQI+fyJ4wb22wdYTys4dq0QkwvCQsHL517ch3ma6m27JPTuvoYWWX8PE" },
    "C3": { file: "C3.mp3", integrity: "sha384-gfa61gndQ/me6abmNOPo3dVTZK36UyIXtssZIeIc+xva9Pmd1UErbsM7go1+/X6x" },
    "D#3": { file: "Ds3.mp3", integrity: "sha384-pGtmfQTG31jazESvNbKONG78appw6PTVuPaBLyrPgAo21RSeCtf0Mdjs8FJ3Sui1" },
    "F#3": { file: "Fs3.mp3", integrity: "sha384-L5N1anntClvu6Ylk4PgRo13eF4TN+1Jyhco+RJ8mi3LFJuFyDfrxMGARwT/tVB4T" },
    "A3": { file: "A3.mp3", integrity: "sha384-cGVfWQHtpC11b7V6G2McQsCEZbYZ0mOYZ+in4cbP2ng05pSmuY3kJSDXhLtvXymH" },
    "C4": { file: "C4.mp3", integrity: "sha384-7aeXwHQ3YPPNkZcQpQYXMxh366zQo16NzCr6zlZxLOoJWTOJ1pdWw/5aNl0ArgWf" },
    "D#4": { file: "Ds4.mp3", integrity: "sha384-I2e+1KF9ARZtbCDFfsNufahuW5MYqDSrnOMK9kgkcQgoea82EHs5zZBKgPfVXj6O" },
    "F#4": { file: "Fs4.mp3", integrity: "sha384-vo2x1TbMWywif05WScAIRnJ/JKy41tEadBXYidh0wq/JHlUr3m+2zhXiU/Zpj8Wh" },
    "A4": { file: "A4.mp3", integrity: "sha384-H8Zat0aaLU4MhDw8Du85khRadDM+MTvEYbLjBCLmUC+vVrBbOyYp0hgL4FqGAaQf" },
    "C5": { file: "C5.mp3", integrity: "sha384-2UVefCM+B7SlF4QX7W95uEya5zKe/NOWcbtB0wj1yrNGRgAbPlSrNqiPxGWoueHr" },
    "D#5": { file: "Ds5.mp3", integrity: "sha384-ACgzo+btSU0SISonSqTRqixBFmpcUFiXCeiMJ0m9La2ZdMwWdXEQjuew3bQNy/pV" },
    "F#5": { file: "Fs5.mp3", integrity: "sha384-zTpAG5qAgGUW1SzGHt8p+mAHhb1m4h/oVbrlVvm0H2BbLGJbSqdEdYvMx7jxj8C+" },
    "A5": { file: "A5.mp3", integrity: "sha384-dtjCXj+6EAQac5VRTSXgVBJDf7eeH8c/0lwcA8YtLByahb4rvCRBaJVR382KmT9L" },
    "C6": { file: "C6.mp3", integrity: "sha384-zr9pt4R+VajZHA8JuUGtlnEOcVuoaR9C87K7hz6JFRt0XfQbDXCP/YMsHQEEdj/0" },
    "D#6": { file: "Ds6.mp3", integrity: "sha384-NiLoBAAnOx7Kl5g7zfSfGw/lNaKLD+u5Yl+7VDokPsyozsUeT/UHiiXA2AgRGT4o" },
    "F#6": { file: "Fs6.mp3", integrity: "sha384-3PrBef/RROV0Dc45BOtyTbJveXZoXPRXVNwa3QWk9z913MJRzMPwT931C3AwDXVE" },
    "A6": { file: "A6.mp3", integrity: "sha384-KSlQZWJzWT5sGtc/Lfv6uOmmeZZi0uRBhmmtbZdM1zlB1PhYEf7ThYTk1U9EcHCI" },
    "C7": { file: "C7.mp3", integrity: "sha384-JhKry2Mvb9nLMdLxy3S56k8IN2Povw5f8kaoM0cE+zXWveTUhjdg5zJM24JE5Iq9" },
    "D#7": { file: "Ds7.mp3", integrity: "sha384-w7O2/AqygduLCuZl+2YNGY0RolygqIwFCQcCVKB6Qzc9c7BESeIBtjQVUqPNzgMr" },
    "F#7": { file: "Fs7.mp3", integrity: "sha384-tlt0PKuZLu69kIrBOYJc8OnzeV253lmkPx9a32PTD4YO0Qj1sX8kC40xKc0l3Dvx" },
    "A7": { file: "A7.mp3", integrity: "sha384-STe6b1jJf/lXRwbf8vPLwed8pfR0fnQo6gPmBUkkzOxS/5Ua2DyYrfVDQdijTaqI" },
    "C8": { file: "C8.mp3", integrity: "sha384-7et8YBzg7fqplaL5KhYRgpZ6F8IKsJNjBMdQh4JRhjzPuLsD/vCZu/YUTDWdcXtl" },
  },
};
