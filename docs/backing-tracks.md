# Playing with backing tracks

Open a key and scale, then go to **Backing tracks** below the fretboard (**Faixas de acompanhamento** in Portuguese or **Pistas de acompañamiento** in Spanish). To try a modal groove, start with Dorian on guitar. [Play C Dorian on guitar](https://tukany.com/?key=C&scale=dorian)

Each track shows its creator and two tags, one for style and one for tempo. For example, Cliff Smith’s organ-trio minor blues is tagged **Blues** and **60 BPM**. **Tempo unlisted** means the catalog has no published tempo for the track. Tonic drones are tagged **Unmetered** because they sustain a pitch without a beat.

Select a title to play it below the list. All matching tracks stay visible, and the current track is highlighted. Select the same title again to stop playback and close the player, or select another title to switch tracks. The × beside the title also closes the player.

**Search YouTube** opens results in a new tab for the selected key, scale, and instrument. Bass searches ask for bassless tracks so you can play the bass line.

## Finding a musical match

Tukany lists the curated tracks that match the selected root, scale, and instrument. A saved custom formula with the same intervals as a named scale gets that scale’s matches. Where a named scale lacks its own arrangement, selected chord–scale pairings offer a **Tonic chord** piano recording and a tonic drone. For example, a C7 piano vamp lets you supply the passing B natural in C dominant bebop. The list names the chord explicitly. Other gaps get the sustained root.

For guitar, Cliff Smith’s pop rock, jazz swing, minor blues, and 12-bar blues each cover all twelve keys at three tempos, with chord charts in the videos. For bass, The Guitar Garden’s twelve minor blues recordings leave out the bass part so you can supply it. Further selections include funk, metal, and modal practice. BoneZone Studio supplies a drone for each of the twelve roots. [Cliff Smith Backing Tracks](https://cliffsmithguitarlessons.co.uk/free-music-resources/backing-tracks/) · [The Guitar Garden’s bassless blues](https://www.youtube.com/playlist?list=PLepDpFiL3T5qp2bqD7oDlY4xC03kRh6yh) · [BoneZone Studio’s tuning drones](https://www.youtube.com/playlist?list=PL1gRvNlbTnCAsSz3SB6NCrXxUh3_jKn6S)

Fretmeup’s guitar lessons cover all seven modes of the major scale in all twelve keys. Each holds the selected tonic in the bass while the chords bring out the mode. For example, C Dorian alternates E♭/C and F/C, bringing out A natural. C Phrygian alternates E♭/C and D♭/C, bringing out D♭. The videos include fretboard diagrams. [C Dorian chord chart](https://www.guitar-chords.org.uk/blog/c-dorian-jam-track-funky-groove/) · [C Phrygian chord chart](https://www.guitar-chords.org.uk/blog/c-phrygian-jam-track-reggae-style/) · [F major country pop](https://www.guitar-chords.org.uk/blog/f-major-ionian-jam-track-country-pop-style/)

For bass, JAZZ LICK DAILY’s 120 BPM swing recordings leave the bass line open and stay in one major key for the entire ii–V–I. Tomas Sandanus also supplies bassless rock arrangements in E, F, and G. For guitarists exploring harmonic minor, Quist’s seven grooves each emphasize a specific mode on its own tonic. The E Phrygian dominant groove, for example, uses E7 and Fmaj7 to bring out both G♯ and F. [Bassless swing series](https://www.youtube.com/playlist?list=PLB1ejHZXJB_Qkds3Yu4jcZ454yeMGmXj2) · [F major bassless funk rock](https://www.youtube.com/watch?v=-r0PTM0KbO4) · [Quist’s harmonic minor chord charts](https://quistorama.com/album/1639902/groovin-through-the-harmonic-minor-modes)

Bass players have dedicated Dorian funk workouts as well as Phrygian, Lydian, Mixolydian, Locrian and harmonic minor arrangements in all twelve keys. Guitarists can explore harmonic major, double harmonic and melodic minor modes, and selected Japanese pentatonic scales. Single-chord recordings from Chord progressions for everyone use solo piano for guitar or bass to play over. Their notes specify the chord, meter and tempo. [Bassless Dorian workouts](https://livebackingtrack.bandcamp.com/album/bassless-dorian-funk-workout-backing-tracks-12-keys-collection) · [Harmonic major play-alongs](https://www.youtube.com/playlist?list=PLVPfdBEU3SOsNK_2tYadBjckDuODHSiCK) · [Example piano chord chart](https://www.youtube.com/watch?v=kJPh6rkNE_8)

For melodic minor practice in any key, Cyril Michaud supplies a sustained minor-major seventh chord. These unmetered recordings leave room for either instrument, and the composer recommends them for the jazz melodic minor scale. [Composer’s chord and scale notes](https://cyrilmichaud.bandcamp.com/album/one-minor-major-7-chord-ambient-backing-tracks)

## Updating the catalog

The [catalog](../src/backing-track-catalog.mjs) includes separate collections for [guitar](../src/guitar-practice-tracks.mjs), [bass](../src/bass-practice-tracks.mjs) and [arpeggios](../src/arpeggio-practice-tracks.mjs). Record the video ID, creator, instrument, root pitch class (C = 0), compatible scale IDs, style and published BPM. Check the creator’s chord chart or arrangement notes, including bridges and turnarounds. For bass, confirm the specific mix leaves the bass part open. Mark a free-time track as unmetered when the creator identifies it that way.

Run `npm run check:backing-tracks` with internet access to check the embed and channel credit for every video. Verify representative playback inside Tukany as well. YouTube can apply regional or sign-in restrictions at playback time.

Browsing happens on the device and needs no YouTube Data API key. Selecting a track loads YouTube’s standard player and its optional error-reporting API. YouTube controls ads, sign-in prompts and video availability. [YouTube embedded player documentation](https://developers.google.com/youtube/player_parameters) · [Ads on embedded videos](https://support.google.com/youtube/answer/132596)
