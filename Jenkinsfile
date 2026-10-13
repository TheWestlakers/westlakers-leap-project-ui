pipeline {
    agent {
        docker {
            image 'node:24-bookworm'
            reuseNode true
        }
    }

    options {
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm install'
                    } else {
                        bat 'npm install'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run build'
                    } else {
                        bat 'npm run build'
                    }
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run test -- --watch=false --no-progress'
                    } else {
                        bat 'npm run test -- --watch=false --no-progress'
                    }
                }
            }
        }
    }
}
